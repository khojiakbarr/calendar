import type { CalendarEvent, CalendarResource, DateRange, EventDraft, EventPatch, EventSource } from "../types"
import { addDays, startOfDay, withMinutesOfDay, overlaps } from "../core/date"

/**
 * Three sample resources (calendars) for the demo.
 * The calendar uses these to color-code events in the UI.
 */
export const demoResources: CalendarResource[] = [
  { id: "team", name: "Bryntum team", color: "#3b82f6" },
  { id: "hotel", name: "Hotel Park", color: "#f59e0b" },
  { id: "michael", name: "Michael Johnson", color: "#ef4444" },
]

/**
 * A log entry tracking what the mock server did: when, what method, and what happened.
 * The `onLog` callback receives entries as operations complete, useful for debugging or testing.
 */
export interface ServerLogEntry {
  at: Date
  method: "load" | "create" | "update" | "remove"
  detail: string
}

/**
 * An in-memory fake backend for the calendar.
 *
 * Holds events in a Map, simulates network latency, and can be configured to fail or succeed.
 * Every mutation creates fresh copies so the caller cannot accidentally mutate the server's state.
 * All times use local Date objects (not UTC strings), matching the calendar's expectations.
 *
 * @param options.latencyMs - Network delay before each operation resolves or rejects (default 350ms)
 * @param options.failNext - Called before each operation; return true to reject instead
 * @param options.onLog - Called as each operation completes, for observability
 * @param options.seed - Anchor date for deterministic sample data (default now)
 * @returns An EventSource plus an `events()` method to inspect the server's state
 *
 * @example
 * const server = createMockServer({ latencyMs: 100 })
 * const events = await server.load({ start: new Date(), end: addDays(new Date(), 7) }, { signal })
 * const newEvent = await server.create({ name: "Meeting", start, end, resourceId: "team" })
 */
export function createMockServer(options?: {
  latencyMs?: number
  failNext?: () => boolean
  onLog?: (entry: ServerLogEntry) => void
  seed?: Date
}): EventSource & { events(): CalendarEvent[] } {
  const latencyMs = options?.latencyMs ?? 350
  const failNext = options?.failNext ?? (() => false)
  const onLog = options?.onLog
  const seed = options?.seed ?? new Date()

  const store = new Map<string, CalendarEvent>()
  const seeded = seedEvents(seed)
  seeded.forEach((ev) => store.set(ev.id, ev))

  let eventCounter = store.size

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const log = (method: ServerLogEntry["method"], detail: string) => {
    if (onLog) {
      onLog({ at: new Date(), method, detail })
    }
  }

  return {
    async load(range: DateRange, { signal }: { signal: AbortSignal }): Promise<CalendarEvent[]> {
      return new Promise((resolve, reject) => {
        if (signal.aborted) {
          reject(new DOMException("AbortError", "AbortError"))
          return
        }

        const abortListener = () => {
          reject(new DOMException("AbortError", "AbortError"))
        }
        signal.addEventListener("abort", abortListener)

        ;(async () => {
          try {
            if (failNext()) {
              await delay(latencyMs)
              reject(new Error("Simulated server failure"))
              return
            }

            await delay(latencyMs)

            if (signal.aborted) {
              reject(new DOMException("AbortError", "AbortError"))
              return
            }

            const results = Array.from(store.values())
              .filter((ev) => overlaps(ev, range))
              .map((ev) => ({
                ...ev,
                start: new Date(ev.start),
                end: new Date(ev.end),
              }))

            log("load", `${range.start.toISOString().split("T")[0]} → ${range.end.toISOString().split("T")[0]} (${results.length} events)`)
            resolve(results)
          } catch (err) {
            reject(err)
          } finally {
            signal.removeEventListener("abort", abortListener)
          }
        })()
      })
    },

    async create(draft: EventDraft): Promise<CalendarEvent> {
      if (failNext()) {
        await delay(latencyMs)
        throw new Error("Simulated server failure")
      }

      await delay(latencyMs)

      const id = `ev-${++eventCounter}`
      const event: CalendarEvent = {
        ...draft,
        id,
        start: new Date(draft.start),
        end: new Date(draft.end),
      }
      store.set(id, event)

      log("create", `${id} ${draft.name}`)
      return { ...event, start: new Date(event.start), end: new Date(event.end) }
    },

    async update(id: string, patch: EventPatch, _previous: CalendarEvent): Promise<CalendarEvent> {
      if (failNext()) {
        await delay(latencyMs)
        throw new Error("Simulated server failure")
      }

      await delay(latencyMs)

      const current = store.get(id)
      if (!current) {
        throw new Error(`Event ${id} not found`)
      }

      const updated: CalendarEvent = {
        ...current,
        ...patch,
        id: current.id,
        start: patch.start ? new Date(patch.start) : new Date(current.start),
        end: patch.end ? new Date(patch.end) : new Date(current.end),
      }
      store.set(id, updated)

      const patchKeys = Object.keys(patch).filter((k) => k !== "start" && k !== "end").join(",")
      const detail = patchKeys ? `${id} {${patchKeys}${patch.start || patch.end ? ",time" : ""}}` : `${id} {time}`
      log("update", detail)

      return { ...updated, start: new Date(updated.start), end: new Date(updated.end) }
    },

    async remove(id: string): Promise<void> {
      if (failNext()) {
        await delay(latencyMs)
        throw new Error("Simulated server failure")
      }

      await delay(latencyMs)

      store.delete(id)
      log("remove", id)
    },

    events(): CalendarEvent[] {
      return Array.from(store.values()).map((ev) => ({
        ...ev,
        start: new Date(ev.start),
        end: new Date(ev.end),
      }))
    },
  }
}

/**
 * Generate deterministic sample calendar events around an anchor date.
 *
 * Creates 8 weeks of events (4 before, 4 after the anchor):
 * - Every weekday: Breakfast, Lunch, Dinner at Hotel Park
 * - Anchor week: Hackathon (all-day), Gantt review (3-day), Roadmapping, Review tickets, Active programming, etc.
 * - Other weeks: Weekly sync (Mon 11:00–12:00) and a 2-day Offsite in the second week after
 *
 * All times are in local time. Event IDs are `seed-<n>` for deterministic test data.
 *
 * @param anchor - The center date; events span from 4 weeks before to 4 weeks after
 * @returns Array of CalendarEvent objects, ready for the store
 */
export function seedEvents(anchor: Date): CalendarEvent[] {
  const events: CalendarEvent[] = []
  let id = 0

  const weekStart = startOfDay(anchor)
  // Find Monday of anchor's week
  const day = weekStart.getDay()
  const daysToMonday = (day === 0 ? 6 : day - 1) // Sunday=0 -> 6, Mon=1 -> 0, etc.
  const anchorMonday = addDays(weekStart, -daysToMonday)

  const start8WeeksAgo = addDays(anchorMonday, -28)
  const end8WeeksLater = addDays(anchorMonday, 56)

  // Helper to create event
  const addEvent = (
    name: string,
    day: Date,
    startMinutes: number,
    endMinutes: number,
    resourceId?: string,
    allDay: boolean = false,
  ) => {
    const start = withMinutesOfDay(day, startMinutes)
    const end = withMinutesOfDay(day, endMinutes)
    const event: CalendarEvent = {
      id: `seed-${id++}`,
      name,
      start,
      end,
      allDay,
    }
    if (resourceId) {
      event.resourceId = resourceId
    }
    events.push(event)
  }

  // Every weekday: Breakfast, Lunch, Dinner at hotel
  let current = start8WeeksAgo
  while (current < end8WeeksLater) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Not Sunday or Saturday
      addEvent("Breakfast", current, 9 * 60, 10 * 60, "hotel")
      addEvent("Lunch", current, 14 * 60, 15 * 60, "hotel")
      addEvent("Dinner", current, 19 * 60, 20 * 60, "hotel")
    }
    current = addDays(current, 1)
  }

  // Anchor week events (Sun-Sat of anchor week)
  // A span is ONE event whose exclusive end is midnight after its last day —
  // that is what lets the all-day row draw it as a single bar across the week.
  const addSpan = (name: string, firstDay: Date, dayCount: number, resourceId: string) => {
    events.push({
      id: `seed-${id++}`,
      name,
      start: startOfDay(firstDay),
      end: startOfDay(addDays(firstDay, dayCount)),
      allDay: true,
      resourceId,
    })
  }

  const anchorSunday = addDays(anchorMonday, -1)

  // Hackathon: all-day Sun → Sat of anchor week
  addSpan("Hackathon", anchorSunday, 7, "team")

  // Gantt review + development: 3-day all-day from Tue (anchor week)
  addSpan("Gantt review + development", addDays(anchorMonday, 1), 3, "team")

  // Roadmapping for 2020: Mon 10:00–12:00 (team)
  addEvent("Roadmapping for 2020", anchorMonday, 10 * 60, 12 * 60, "team")

  // Review Assembla tickets: Mon 12:00–14:00 (team)
  addEvent("Review Assembla tickets", anchorMonday, 12 * 60, 14 * 60, "team")

  // Active programming: Mon 13:00–16:30 (team, overlapping with Review)
  addEvent("Active programming", anchorMonday, 13 * 60, 16.5 * 60, "team")

  // Excursion: Tue 10:00–17:00 (michael)
  addEvent("Excursion", addDays(anchorMonday, 1), 10 * 60, 17 * 60, "michael")

  // Team Building: Wed 18:00–20:00 (michael)
  addEvent("Team Building", addDays(anchorMonday, 2), 18 * 60, 20 * 60, "michael")

  // Split.JS conference: Thu 18:00–21:00 (team)
  addEvent("Split.JS conference", addDays(anchorMonday, 3), 18 * 60, 21 * 60, "team")

  // Check-Out & Fly home: Fri 10:00–12:00 (michael)
  addEvent("Check-Out & Fly home", addDays(anchorMonday, 4), 10 * 60, 12 * 60, "michael")

  // A few more so the anchor week reads like a real diary: a daily standup,
  // one overlap on Friday, a dentist visit, and a two-day conference next week.
  for (let weekday = 0; weekday < 5; weekday += 1) {
    addEvent("Standup", addDays(anchorMonday, weekday), 8 * 60 + 30, 9 * 60, "team")
  }
  addEvent("Design review", addDays(anchorMonday, 2), 11 * 60, 12 * 60 + 30, "team")
  addEvent("Dentist", addDays(anchorMonday, 3), 15 * 60, 16 * 60, "michael")
  addEvent("Client call", addDays(anchorMonday, 4), 14 * 60 + 30, 15 * 60 + 30, "michael")
  addSpan("React conference", addDays(anchorMonday, 9), 2, "team")

  // Other weeks: Weekly sync (Mon 11:00–12:00) and Offsite (2-day, all-day in second week after)
  for (let weekOffset of [-4, -3, -2, -1, 1, 2, 3, 4]) {
    const weekMon = addDays(anchorMonday, weekOffset * 7)

    // Weekly sync on Mondays
    addEvent("Weekly sync", weekMon, 11 * 60, 12 * 60, "team")

    // Offsite in the second week after (weekOffset === 2)
    if (weekOffset === 2) {
      addSpan("Offsite", weekMon, 2, "michael")
    }
  }

  return events
}
