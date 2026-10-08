import type { CalendarEvent, EventSource, EventSourceAction } from "@/index"

/** Options for {@link createMemorySource}. */
export interface MemorySourceOptions {
  /** How long each call takes, so the loading bar and the optimistic states can be seen. Default 250 ms. */
  latencyMs?: number
  /** Told one line per call, for the examples that show the traffic. */
  onRequest?: (line: string) => void
  /** Asked before each call settles; `true` rejects it, as a server that says no would. */
  shouldFail?: (action: EventSourceAction) => boolean
}

/** A local `yyyy-mm-dd`, for the request log. */
const formatDay = (date: Date): string => date.toLocaleDateString("en-CA")

/**
 * An `EventSource` that keeps its events in memory, for examples that need no
 * backend. It behaves like a real one in the ways the calendar relies on: every
 * call takes a moment, `load` returns only what overlaps the range it was asked
 * for and honours the abort signal, and a call may be refused.
 *
 * @param initial - The events the "server" starts with.
 * @param options - Latency, a request log and a way to make calls fail.
 * @returns A source with all four methods.
 *
 * @example
 * const source = createMemorySource([{ id: "1", name: "Stand-up", start, end }])
 */
export function createMemorySource(initial: CalendarEvent[], options: MemorySourceOptions = {}): EventSource {
  const { latencyMs = 250, onRequest, shouldFail } = options
  const events = new Map(initial.map((event) => [event.id, event]))
  let created = 0

  // Every call waits a moment and may then refuse, as a network does.
  const respond = async (action: EventSourceAction, line: string): Promise<void> => {
    onRequest?.(line)
    await new Promise((resolve) => setTimeout(resolve, latencyMs))
    if (shouldFail?.(action)) throw new Error("The server refused")
  }

  return {
    async load(range, { signal }) {
      await respond("load", `load ${formatDay(range.start)} → ${formatDay(range.end)}`)
      signal.throwIfAborted()
      return [...events.values()].filter((event) => event.start < range.end && event.end > range.start)
    },
    async create(draft) {
      await respond("create", `create "${draft.name}"`)
      const event = { ...draft, id: `new-${++created}` }
      events.set(event.id, event)
      return event
    },
    async update(id, patch) {
      await respond("update", `update ${id}`)
      const current = events.get(id)
      if (!current) throw new Error(`No event ${id}`)
      const updated = { ...current, ...patch }
      events.set(id, updated)
      return updated
    },
    async remove(id) {
      await respond("remove", `remove ${id}`)
      events.delete(id)
    },
  }
}
