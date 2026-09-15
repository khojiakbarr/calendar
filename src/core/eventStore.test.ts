import { describe, expect, it } from "vitest"
import type { CalendarEvent, DateRange } from "../types"
import {
  TEMP_ID_PREFIX,
  emptyStore,
  eventsInRange,
  isCovered,
  mergeLoaded,
  removeEventById,
  unionRanges,
  upsertEvent,
} from "./eventStore"

/** March 2022, local time — the month the Bryntum demo opens on. */
function at(day: number, hour = 0, minute = 0): Date {
  return new Date(2022, 2, day, hour, minute)
}

function range(fromDay: number, toDay: number): DateRange {
  return { start: at(fromDay), end: at(toDay) }
}

function event(id: string, startDay: number, endDay: number, name = id): CalendarEvent {
  return { id, name, start: at(startDay), end: at(endDay) }
}

function storeOf(...events: CalendarEvent[]): ReturnType<typeof emptyStore> {
  return events.reduce((state, next) => upsertEvent(state, next), emptyStore())
}

describe("emptyStore", () => {
  it("starts with no events and no loaded ranges", () => {
    const state = emptyStore()

    expect(state.byId.size).toBe(0)
    expect(state.loaded).toEqual([])
  })
})

describe("unionRanges", () => {
  it("keeps disjoint ranges apart and sorted", () => {
    const merged = unionRanges([range(10, 12)], range(1, 3))

    expect(merged).toEqual([range(1, 3), range(10, 12)])
  })

  it("merges overlapping ranges into one", () => {
    const merged = unionRanges([range(1, 5)], range(3, 9))

    expect(merged).toEqual([range(1, 9)])
  })

  it("joins adjacent ranges, so a query spanning both counts as covered", () => {
    const merged = unionRanges([range(1, 5)], range(5, 9))

    expect(merged).toEqual([range(1, 9)])
  })

  it("collapses a range that bridges two existing ones", () => {
    const merged = unionRanges([range(1, 3), range(8, 10)], range(2, 9))

    expect(merged).toEqual([range(1, 10)])
  })

  it("swallows a range already contained in another", () => {
    const merged = unionRanges([range(1, 10)], range(4, 6))

    expect(merged).toEqual([range(1, 10)])
  })

  it("does not modify the list it was given", () => {
    const existing = [range(1, 5)]

    unionRanges(existing, range(3, 9))

    expect(existing).toEqual([range(1, 5)])
  })
})

describe("isCovered", () => {
  it("is false for an empty store", () => {
    expect(isCovered(emptyStore(), range(1, 2))).toBe(false)
  })

  it("is true for a range inside a loaded range", () => {
    const state = mergeLoaded(emptyStore(), range(1, 10), [])

    expect(isCovered(state, range(3, 4))).toBe(true)
    expect(isCovered(state, range(1, 10))).toBe(true)
  })

  it("is false when only part of the range was loaded", () => {
    const state = mergeLoaded(emptyStore(), range(1, 10), [])

    expect(isCovered(state, range(8, 12))).toBe(false)
  })

  it("is true across two loaded ranges that were merged into one", () => {
    const first = mergeLoaded(emptyStore(), range(1, 8), [])
    const state = mergeLoaded(first, range(8, 15), [])

    expect(isCovered(state, range(6, 10))).toBe(true)
  })
})

describe("mergeLoaded", () => {
  it("adds the returned events and marks the range loaded", () => {
    const state = mergeLoaded(emptyStore(), range(1, 8), [event("a", 2, 3)])

    expect([...state.byId.keys()]).toEqual(["a"])
    expect(state.loaded).toEqual([range(1, 8)])
  })

  it("replaces a cached event with the server's version", () => {
    const cached = storeOf({ ...event("a", 2, 3), name: "stale" })

    const state = mergeLoaded(cached, range(1, 8), [{ ...event("a", 2, 3), name: "fresh" }])

    expect(state.byId.get("a")?.name).toBe("fresh")
  })

  it("drops a cached event inside the range that the server did not return", () => {
    const cached = storeOf(event("deleted", 2, 3), event("kept", 4, 5))

    const state = mergeLoaded(cached, range(1, 8), [event("kept", 4, 5)])

    expect(state.byId.has("deleted")).toBe(false)
    expect(state.byId.has("kept")).toBe(true)
  })

  it("keeps cached events that lie outside the loaded range", () => {
    const cached = storeOf(event("elsewhere", 20, 21))

    const state = mergeLoaded(cached, range(1, 8), [])

    expect(state.byId.has("elsewhere")).toBe(true)
  })

  it("keeps temporary events, whose create is still in flight", () => {
    const pending = `${TEMP_ID_PREFIX}1`
    const cached = storeOf(event(pending, 2, 3))

    const state = mergeLoaded(cached, range(1, 8), [])

    expect(state.byId.has(pending)).toBe(true)
  })

  it("does not modify the store it was given", () => {
    const cached = storeOf(event("deleted", 2, 3))

    mergeLoaded(cached, range(1, 8), [])

    expect(cached.byId.has("deleted")).toBe(true)
    expect(cached.loaded).toEqual([])
  })

  it("keeps the local copy of a protected id instead of the server's stale one", () => {
    const cached = storeOf({ ...event("a", 2, 3), name: "optimistic" })
    const protectedIds = new Set(["a"])

    const state = mergeLoaded(cached, range(1, 8), [{ ...event("a", 2, 3), name: "stale-server" }], protectedIds)

    expect(state.byId.get("a")?.name).toBe("optimistic")
  })

  it("keeps a protected id absent even when the server still returns it", () => {
    // Stands in for an event whose optimistic remove has already applied: it
    // has no cached entry, but the id is still protected while the remove
    // is in flight, so a stale server copy must not bring it back.
    const cached = storeOf(event("kept", 4, 5))
    const protectedIds = new Set(["removed-id"])

    const state = mergeLoaded(cached, range(1, 8), [event("removed-id", 2, 3), event("kept", 4, 5)], protectedIds)

    expect(state.byId.has("removed-id")).toBe(false)
  })

  it("still applies the server's version to an id that is not protected", () => {
    const cached = storeOf({ ...event("a", 2, 3), name: "stale" })
    const protectedIds = new Set(["other-id"])

    const state = mergeLoaded(cached, range(1, 8), [{ ...event("a", 2, 3), name: "fresh" }], protectedIds)

    expect(state.byId.get("a")?.name).toBe("fresh")
  })
})

describe("upsertEvent", () => {
  it("inserts an unknown event", () => {
    const state = upsertEvent(emptyStore(), event("a", 2, 3))

    expect(state.byId.get("a")?.id).toBe("a")
  })

  it("replaces an event with the same id and leaves the original store alone", () => {
    const before = storeOf({ ...event("a", 2, 3), name: "before" })

    const after = upsertEvent(before, { ...event("a", 2, 3), name: "after" })

    expect(after.byId.get("a")?.name).toBe("after")
    expect(before.byId.get("a")?.name).toBe("before")
  })

  it("keeps the loaded ranges", () => {
    const loaded = mergeLoaded(emptyStore(), range(1, 8), [])

    const state = upsertEvent(loaded, event("a", 2, 3))

    expect(state.loaded).toEqual([range(1, 8)])
  })
})

describe("removeEventById", () => {
  it("drops the event without touching the original store", () => {
    const before = storeOf(event("a", 2, 3), event("b", 4, 5))

    const after = removeEventById(before, "a")

    expect([...after.byId.keys()]).toEqual(["b"])
    expect(before.byId.has("a")).toBe(true)
  })

  it("returns the same store for an unknown id, so React can skip the render", () => {
    const before = storeOf(event("a", 2, 3))

    expect(removeEventById(before, "missing")).toBe(before)
  })
})

describe("eventsInRange", () => {
  it("returns only events that overlap the half-open range", () => {
    const state = storeOf(event("before", 1, 2), event("touching", 2, 3), event("after", 5, 6))

    const found = eventsInRange(state, range(2, 5))

    expect(found.map((found) => found.id)).toEqual(["touching"])
  })

  it("includes an event that merely straddles the range edge", () => {
    const state = storeOf(event("straddles", 1, 4))

    expect(eventsInRange(state, range(3, 6)).map((found) => found.id)).toEqual(["straddles"])
  })

  it("sorts by start ascending, then end descending, then name", () => {
    const state = storeOf(
      { ...event("short", 2, 3), name: "Short" },
      { ...event("long", 2, 6), name: "Long" },
      { ...event("later", 4, 5), name: "Later" },
      { ...event("alsoShort", 2, 3), name: "Another" },
    )

    const found = eventsInRange(state, range(1, 10))

    expect(found.map((found) => found.name)).toEqual(["Long", "Another", "Short", "Later"])
  })

  it("returns an empty array when nothing overlaps", () => {
    expect(eventsInRange(storeOf(event("a", 2, 3)), range(10, 12))).toEqual([])
  })
})
