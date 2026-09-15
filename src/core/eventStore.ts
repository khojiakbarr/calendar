import type { CalendarEvent, DateRange } from "../types"
import { overlaps } from "./date"

/**
 * Prefix of the ids the calendar invents for events the server has not stored yet.
 *
 * An optimistic create has to be drawn before the server answers, and drawing it
 * means giving it an id. Marking that id makes it recognisable later: a temporary
 * event must survive a background load that happens while its create is still in
 * flight, even though the server could not possibly have returned it.
 */
export const TEMP_ID_PREFIX = "tmp:"

/**
 * Every event the calendar has been told about, and which ranges it already asked for.
 *
 * `loaded` is kept merged and sorted by {@link unionRanges}, so "have we already
 * fetched this?" is a scan for one entry that contains the range rather than a
 * set-cover problem.
 */
export interface EventStoreState<TData = unknown> {
  byId: ReadonlyMap<string, CalendarEvent<TData>>
  loaded: readonly DateRange[]
}

/**
 * A store that knows nothing yet.
 *
 * @returns An empty store; the starting value and what `reload()` resets to.
 */
export function emptyStore<TData = unknown>(): EventStoreState<TData> {
  return { byId: new Map(), loaded: [] }
}

/**
 * Add `range` to `ranges`, merging anything that overlaps or touches it.
 *
 * Adjacent ranges are joined rather than kept side by side: `[Mon, Tue)` and
 * `[Tue, Wed)` leave no gap between them, and a query spanning both would look
 * uncovered if they stayed separate — which would refetch data already held.
 *
 * @param ranges - The merged, sorted ranges held so far. Not modified.
 * @param range - The range just fetched.
 * @returns A new merged, sorted list.
 */
export function unionRanges(ranges: readonly DateRange[], range: DateRange): DateRange[] {
  const sorted = [...ranges, range].sort((a, b) => a.start.getTime() - b.start.getTime())
  const merged: DateRange[] = []

  for (const next of sorted) {
    const last = merged[merged.length - 1]
    if (!last || next.start.getTime() > last.end.getTime()) {
      merged.push({ start: next.start, end: next.end })
      continue
    }
    if (next.end.getTime() > last.end.getTime()) {
      merged[merged.length - 1] = { start: last.start, end: next.end }
    }
  }

  return merged
}

/**
 * Whether every instant of `range` has already been fetched.
 *
 * @param state - The store to ask.
 * @param range - The window the view needs.
 * @returns True when one loaded range contains `range` — which, because
 *   `loaded` is kept merged, is the same as the union containing it.
 */
export function isCovered<TData>(state: EventStoreState<TData>, range: DateRange): boolean {
  return state.loaded.some(
    (loaded) => loaded.start.getTime() <= range.start.getTime() && loaded.end.getTime() >= range.end.getTime(),
  )
}

/**
 * Fold a server response for `range` into the store.
 *
 * The response is the truth for that window: an event the store cached inside
 * `range` that the server did not return has been deleted or moved away by
 * someone else, so it is dropped rather than left on screen as a ghost.
 * Temporary events are exempt — their create is still in flight, so the server
 * could not have returned them, and dropping them would make the event the user
 * just drew flicker out.
 *
 * `protectedIds` extends that same exemption to events with a mutation of their
 * own in flight. A `load` and an `update`/`remove` race independently of each
 * other; a response that started before the edit but lands after it carries a
 * server snapshot older than what the user already sees (or, for a remove, an
 * event that should now be gone). Ignoring the response for those ids — rather
 * than trying to merge or timestamp-compare — keeps the local optimistic state
 * as the truth until the edit itself settles.
 *
 * @param state - The store before the response.
 * @param range - The window that was requested.
 * @param events - Everything the server returned for it.
 * @param protectedIds - Ids with an edit in flight; their local copy (including
 *   absence, for one being removed) is kept and the server's version for them
 *   is ignored outright, the same as a temporary id.
 * @returns A new store with the response applied and `range` marked as loaded.
 */
export function mergeLoaded<TData>(
  state: EventStoreState<TData>,
  range: DateRange,
  events: readonly CalendarEvent<TData>[],
  protectedIds?: ReadonlySet<string>,
): EventStoreState<TData> {
  const isProtected = (id: string): boolean => id.startsWith(TEMP_ID_PREFIX) || (protectedIds?.has(id) ?? false)

  const incoming = new Map(events.map((event) => [event.id, event]))
  const byId = new Map<string, CalendarEvent<TData>>()

  for (const [id, event] of state.byId) {
    if (isProtected(id)) {
      byId.set(id, event)
      continue
    }
    if (incoming.has(id)) continue
    if (overlaps(event, range)) continue
    byId.set(id, event)
  }

  for (const [id, event] of incoming) {
    // A protected id keeps its local copy even when it has no cached entry —
    // e.g. one being removed — so the server's stale snapshot never resurrects it.
    if (isProtected(id)) continue
    byId.set(id, event)
  }

  return { byId, loaded: unionRanges(state.loaded, range) }
}

/**
 * Insert an event, or replace the one with the same id.
 *
 * The single write path for every optimistic edit, so a create, a move and a
 * server confirmation all leave the store in the same shape.
 *
 * @param state - The store before the change.
 * @param event - The event to store.
 * @returns A new store; `state` is untouched so a rollback can restore it.
 */
export function upsertEvent<TData>(
  state: EventStoreState<TData>,
  event: CalendarEvent<TData>,
): EventStoreState<TData> {
  const byId = new Map(state.byId)
  byId.set(event.id, event)
  return { byId, loaded: state.loaded }
}

/**
 * Drop an event by id.
 *
 * @param state - The store before the change.
 * @param id - The event to forget; unknown ids are not an error.
 * @returns A new store, or `state` itself when nothing changed — an identical
 *   reference lets React skip a re-render for a no-op delete.
 */
export function removeEventById<TData>(state: EventStoreState<TData>, id: string): EventStoreState<TData> {
  if (!state.byId.has(id)) return state
  const byId = new Map(state.byId)
  byId.delete(id)
  return { byId, loaded: state.loaded }
}

/**
 * Compare two events the way every view wants to draw them.
 *
 * Earliest first; among events starting together the longest first, so a
 * day-long meeting becomes the background bar the shorter ones sit on; name
 * last so the order never depends on insertion order.
 */
function compareEvents<TData>(a: CalendarEvent<TData>, b: CalendarEvent<TData>): number {
  const byStart = a.start.getTime() - b.start.getTime()
  if (byStart !== 0) return byStart
  const byEnd = b.end.getTime() - a.end.getTime()
  if (byEnd !== 0) return byEnd
  return a.name.localeCompare(b.name)
}

/**
 * Every cached event that overlaps `range`, in drawing order.
 *
 * @param state - The store to read.
 * @param range - The half-open window to intersect with.
 * @returns A new array sorted by start ascending, then end descending, then name.
 */
export function eventsInRange<TData>(state: EventStoreState<TData>, range: DateRange): CalendarEvent<TData>[] {
  const found: CalendarEvent<TData>[] = []
  for (const event of state.byId.values()) {
    if (overlaps(event, range)) found.push(event)
  }
  return found.sort(compareEvents)
}
