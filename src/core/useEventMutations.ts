import { useCallback, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import type {
  CalendarEvent,
  EventDraft,
  EventPatch,
  EventSource,
  EventSourceAction,
} from "../types"
import { TEMP_ID_PREFIX, removeEventById, upsertEvent, type EventStoreState } from "./eventStore"

/** Everything {@link useEventMutations} needs. */
export interface UseEventMutationsOptions<TData> {
  /** Where edits go. Read through a ref — hosts pass an inline object. */
  source: EventSource<TData>
  /** The current store, read to snapshot an event before changing it. */
  store: EventStoreState<TData>
  setStore: Dispatch<SetStateAction<EventStoreState<TData>>>
  /** Called with the rejection and the action that caused it. Read through a ref. */
  onError?: ((error: unknown, action: EventSourceAction) => void) | undefined
}

/** The three edits, plus which events are waiting on the server. */
export interface EventMutations<TData> {
  pendingIds: ReadonlySet<string>
  createEvent(draft: EventDraft<TData>): Promise<CalendarEvent<TData> | null>
  updateEvent(id: string, patch: EventPatch<TData>): Promise<CalendarEvent<TData> | null>
  removeEvent(id: string): Promise<boolean>
}

/**
 * Per-id bookkeeping for mutations still awaiting the server.
 *
 * One event can have more than one mutation racing against it — a second drag
 * fired before the first's request returned, or an update that was still in
 * flight when the event got deleted — and whichever settles last is not
 * necessarily the one whose result should stick. `seq` and `removed` are what
 * let a mutation tell, at the moment it settles, whether it is still the one
 * allowed to write.
 */
interface MutationOp {
  /** Sequence number of the most recently started update for this id; a
   *  settling update only writes when its own number still matches — otherwise
   *  a later update has already superseded it. */
  seq: number
  /** How many mutations for this id are currently awaiting the server. The
   *  count, not a flag, is what `pendingIds` is derived from, so the first of
   *  two overlapping mutations to finish does not mark the id as done while
   *  the second is still running. */
  inFlight: number
  /** Set the instant a remove starts, before it awaits anything: an update
   *  already in flight for the same id must not resurrect the event when it
   *  later resolves. Cleared if the remove itself is rejected and rolled back. */
  removed: boolean
}

/**
 * Apply edits to the screen first and to the server second.
 *
 * Dragging an event has to follow the pointer; waiting for a round trip before
 * the chip moves makes the calendar feel broken. So each edit is written to the
 * store immediately and undone precisely if the source rejects: a create drops
 * its temporary event, an update restores the snapshot taken before the patch,
 * a delete puts the event back. The server stays the source of truth without
 * the UI ever waiting on it.
 *
 * An edit whose source method is missing resolves to `null`/`false` without
 * touching the store — the matching gesture is not offered in the first place.
 *
 * Two edits can legitimately overlap on the same id — a second drag before the
 * first request returns, or a delete while an update is still in flight — and
 * network order does not have to match call order. A per-id {@link MutationOp}
 * record (kept in a ref, not state — it is bookkeeping for deciding what to
 * write, not something a view ever renders) tracks how many mutations for that
 * id are outstanding and which one started most recently, so a settling
 * mutation can tell whether its result is still the one that should reach the
 * store.
 *
 * @param options - See {@link UseEventMutationsOptions}.
 * @returns Stable `createEvent`, `updateEvent` and `removeEvent`, and the ids
 *   currently in flight so views can mark them busy.
 */
export function useEventMutations<TData>({
  source,
  store,
  setStore,
  onError,
}: UseEventMutationsOptions<TData>): EventMutations<TData> {
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(() => new Set())

  const latest = useRef({ source, store, onError })
  latest.current = { source, store, onError }

  const ops = useRef(new Map<string, MutationOp>())

  /** The op record for `id`, creating an idle one the first time it is touched. */
  const getOp = useCallback((id: string): MutationOp => {
    const existing = ops.current.get(id)
    if (existing) return existing
    const created: MutationOp = { seq: 0, inFlight: 0, removed: false }
    ops.current.set(id, created)
    return created
  }, [])

  /**
   * Recompute `pendingIds` from `ops` and publish it if it changed.
   *
   * Deriving the whole set fresh, rather than adding/removing one id at a
   * time, is what makes overlapping mutations on one id safe: `pendingIds`
   * can never drift from `inFlight` because it is never updated any other way.
   */
  const syncPendingIds = useCallback(() => {
    const next = new Set<string>()
    for (const [id, op] of ops.current) {
      if (op.inFlight > 0) next.add(id)
    }
    setPendingIds((previous) => {
      if (previous.size === next.size && [...previous].every((id) => next.has(id))) return previous
      return next
    })
  }, [])

  /** An op with nothing left in flight is done; forget it so the map does not
   *  grow for the life of the calendar. */
  const settle = useCallback(
    (id: string, op: MutationOp) => {
      op.inFlight -= 1
      if (op.inFlight <= 0) ops.current.delete(id)
      syncPendingIds()
    },
    [syncPendingIds],
  )

  /** Temporary ids are per-calendar and only have to be unique within this store. */
  const tempCount = useRef(0)

  const createEvent = useCallback(
    async (draft: EventDraft<TData>): Promise<CalendarEvent<TData> | null> => {
      const { source: current, onError: report } = latest.current
      if (!current.create) return null

      tempCount.current += 1
      const tempId = `${TEMP_ID_PREFIX}${tempCount.current}`
      const op = getOp(tempId)
      op.seq += 1
      op.inFlight += 1
      syncPendingIds()

      setStore((previous) => upsertEvent(previous, { ...draft, id: tempId }))

      try {
        const saved = await current.create(draft)
        // The temp id is unique to this single call, so there is never a newer
        // op or a remove for it to defer to — the swap always applies.
        setStore((previous) => upsertEvent(removeEventById(previous, tempId), saved))
        return saved
      } catch (error) {
        setStore((previous) => removeEventById(previous, tempId))
        report?.(error, "create")
        return null
      } finally {
        settle(tempId, op)
      }
    },
    [setStore, getOp, syncPendingIds, settle],
  )

  const updateEvent = useCallback(
    async (id: string, patch: EventPatch<TData>): Promise<CalendarEvent<TData> | null> => {
      const { source: current, store: snapshot, onError: report } = latest.current
      const previousEvent = snapshot.byId.get(id)
      if (!current.update || !previousEvent) return null

      const op = getOp(id)
      const seq = ++op.seq
      op.inFlight += 1
      syncPendingIds()

      setStore((previous) => upsertEvent(previous, { ...previousEvent, ...patch }))

      try {
        const saved = await current.update(id, patch, previousEvent)
        // Write the server's answer only if no later update has started (this
        // one would be stale) and no remove has taken the id since (it must
        // stay gone, not be resurrected by an update that predates the delete).
        if (op.seq === seq && !op.removed) {
          setStore((previous) => upsertEvent(previous, saved))
        }
        return saved
      } catch (error) {
        // Same guard for the rollback: an old update's failure must not undo a
        // newer optimistic write, or restore an event a remove already took —
        // the newer operation's outcome is what settles the truth either way.
        if (op.seq === seq && !op.removed) {
          setStore((previous) => upsertEvent(previous, previousEvent))
        }
        report?.(error, "update")
        return null
      } finally {
        settle(id, op)
      }
    },
    [setStore, getOp, syncPendingIds, settle],
  )

  const removeEvent = useCallback(
    async (id: string): Promise<boolean> => {
      const { source: current, store: snapshot, onError: report } = latest.current
      const previousEvent = snapshot.byId.get(id)
      if (!current.remove || !previousEvent) return false

      const op = getOp(id)
      op.seq += 1
      op.inFlight += 1
      // Marked before the await, synchronously with the optimistic delete: an
      // update already in flight for this id must see the removal the instant
      // it happens, not only once this promise itself settles.
      op.removed = true
      syncPendingIds()

      setStore((previous) => removeEventById(previous, id))

      try {
        await current.remove(id)
        return true
      } catch (error) {
        // The delete never happened, so undo it and let any update still
        // resolving for this id write its result again.
        op.removed = false
        setStore((previous) => upsertEvent(previous, previousEvent))
        report?.(error, "remove")
        return false
      } finally {
        settle(id, op)
      }
    },
    [setStore, getOp, syncPendingIds, settle],
  )

  return { pendingIds, createEvent, updateEvent, removeEvent }
}
