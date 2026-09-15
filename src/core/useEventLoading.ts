import { useCallback, useEffect, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { DateRange, EventSource, EventSourceAction, LoadStatus } from "../types"
import { isCovered, mergeLoaded, type EventStoreState } from "./eventStore"

/** What the toolbar needs to know about the fetch in flight. */
export interface EventLoadingState {
  status: LoadStatus
  /** The rejection from the last failed load; `null` while things are well. */
  error: unknown
}

/** Everything {@link useEventLoading} needs; see the hook for the behaviour. */
export interface UseEventLoadingOptions<TData> {
  /** Where events come from. Read through a ref — hosts pass an inline object. */
  source: EventSource<TData>
  /** The interval to make sure the store holds; usually `loadWindow(range)`. */
  window: DateRange
  /** The current store, consulted to decide whether a fetch is needed at all. */
  store: EventStoreState<TData>
  setStore: Dispatch<SetStateAction<EventStoreState<TData>>>
  /** Called for a genuine failure. Read through a ref — hosts pass an inline function. */
  onError?: ((error: unknown, action: EventSourceAction) => void) | undefined
  /** Bump to force a refetch after the store was emptied by `reload()`. */
  reloadToken: number
  /**
   * Ids with a mutation currently in flight — usually `pendingIds` from
   * {@link useEventMutations}. Passed through to `mergeLoaded` as the response
   * lands, not read when the request started: a request can outlive several
   * mutations, so only the set of ids still in flight *at that moment* is
   * correct to protect.
   */
  protectedIds: ReadonlySet<string>
}

/** Whether a rejection is just the abort we asked for. */
function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError"
}

/**
 * Keep the store covering `window`, one request at a time.
 *
 * Navigation is faster than the network: clicking "next" four times must not
 * leave four responses racing to land in whatever order they arrive. Each new
 * request aborts the one before it, and a response is applied only if it is
 * still the newest — the request counter catches the case an abort cannot,
 * where the source ignores the signal and resolves anyway.
 *
 * Nothing is fetched while the store already covers the window, which is what
 * makes day-by-day navigation inside a loaded week free.
 *
 * @param options - See {@link UseEventLoadingOptions}.
 * @returns The status and error the shell renders; `"loading"` while a request
 *   the user still wants is in flight.
 */
export function useEventLoading<TData>({
  source,
  window: target,
  store,
  setStore,
  onError,
  reloadToken,
  protectedIds,
}: UseEventLoadingOptions<TData>): EventLoadingState {
  const [state, setState] = useState<EventLoadingState>({ status: "idle", error: null })

  // Read at call time, not at effect-schedule time: the source and the error
  // handler are typically inline objects, and depending on their identity would
  // refetch the same window on every render of the host. `protectedIds` needs
  // the same treatment for the reason in its own doc comment.
  const latest = useRef({ source, store, onError, protectedIds })
  latest.current = { source, store, onError, protectedIds }

  const requestId = useRef(0)
  const inFlight = useRef<AbortController | null>(null)

  /** Give up on the running request: nothing on screen needs it any more. */
  const cancelInFlight = useCallback(() => {
    if (!inFlight.current) return
    inFlight.current.abort()
    inFlight.current = null
    // Bump the counter so a source that resolves despite the signal is ignored.
    requestId.current += 1
    setState((previous) => (previous.status === "loading" ? { status: "idle", error: null } : previous))
  }, [])

  // Dates are compared by value: `visibleRange` builds a new Date every render,
  // and depending on identity would restart the request forever.
  const startTime = target.start.getTime()
  const endTime = target.end.getTime()

  useEffect(() => {
    const range: DateRange = { start: new Date(startTime), end: new Date(endTime) }
    if (isCovered(latest.current.store, range)) {
      cancelInFlight()
      return
    }

    cancelInFlight()
    const controller = new AbortController()
    inFlight.current = controller
    const id = ++requestId.current
    setState({ status: "loading", error: null })

    /** Whether this response is still the one the user is waiting for. */
    const isCurrent = (): boolean => id === requestId.current && !controller.signal.aborted

    latest.current.source.load(range, { signal: controller.signal }).then(
      (events) => {
        if (!isCurrent()) return
        inFlight.current = null
        setStore((previous) => mergeLoaded(previous, range, events, latest.current.protectedIds))
        setState({ status: "idle", error: null })
      },
      (error: unknown) => {
        if (!isCurrent() || isAbortError(error)) return
        inFlight.current = null
        setState({ status: "error", error })
        latest.current.onError?.(error, "load")
      },
    )
  }, [startTime, endTime, reloadToken, setStore, cancelInFlight])

  // A calendar that unmounts mid-request should not hold the connection open.
  useEffect(() => () => inFlight.current?.abort(), [])

  return state
}
