import { describe, expect, it } from "vitest"
import type { CalendarEvent } from "../types"
import { addDays } from "./date"
import { layoutSegments, limitRows, type Segment } from "./spans"

let nextId = 0

/** Builds a minimal event for segment-layout tests. */
function makeEvent(start: Date, end: Date, overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  nextId += 1
  return { id: `evt-${nextId}`, name: `Event ${nextId}`, start, end, ...overrides }
}

/** Monday-first week of 2022-03-14..2022-03-20. */
const monday = new Date(2022, 2, 14)
const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i))

/** Mon–Fri only, as if weekends were hidden. */
const weekdays = week.slice(0, 5)

describe("layoutSegments", () => {
  it("places a single-day all-day event at its own column", () => {
    const event = makeEvent(week[1]!, addDays(week[1]!, 1), { allDay: true })

    const [segment] = layoutSegments([event], week, "spans")

    expect(segment).toMatchObject({ startCol: 1, endCol: 1, row: 0, continuesBefore: false, continuesAfter: false, kind: "span" })
  })

  it("spans a 3-day event across its full column range", () => {
    const event = makeEvent(week[1]!, addDays(week[1]!, 3), { allDay: true })

    const [segment] = layoutSegments([event], week, "spans")

    expect(segment).toMatchObject({ startCol: 1, endCol: 3 })
  })

  it("marks continuesBefore for a span that started the week before", () => {
    const event = makeEvent(addDays(monday, -3), addDays(monday, 2), { allDay: true })

    const [segment] = layoutSegments([event], week, "spans")

    expect(segment).toMatchObject({ startCol: 0, continuesBefore: true, continuesAfter: false })
  })

  it("marks continuesAfter for a span that runs into next week", () => {
    const event = makeEvent(week[5]!, addDays(monday, 10), { allDay: true })

    const [segment] = layoutSegments([event], week, "spans")

    expect(segment).toMatchObject({ endCol: 6, continuesAfter: true, continuesBefore: false })
  })

  it("puts two non-overlapping spans on the same row", () => {
    const a = makeEvent(week[0]!, addDays(week[0]!, 1), { allDay: true, name: "A" })
    const b = makeEvent(week[2]!, addDays(week[2]!, 1), { allDay: true, name: "B" })

    const segments = layoutSegments([a, b], week, "spans")

    expect(segments.every((segment) => segment.row === 0)).toBe(true)
  })

  it("stacks overlapping spans onto separate rows", () => {
    const a = makeEvent(week[0]!, addDays(week[0]!, 3), { allDay: true, name: "A" })
    const b = makeEvent(week[1]!, addDays(week[1]!, 2), { allDay: true, name: "B" })

    const segments = layoutSegments([a, b], week, "spans")
    const byName = new Map(segments.map((segment) => [segment.event.name, segment.row]))

    expect(byName.get("A")).toBe(0)
    expect(byName.get("B")).toBe(1)
  })

  it("excludes single-day timed events when include is 'spans'", () => {
    const timed = makeEvent(new Date(2022, 2, 15, 9), new Date(2022, 2, 15, 10))

    const segments = layoutSegments([timed], week, "spans")

    expect(segments).toHaveLength(0)
  })

  it("includes single-day timed events as kind 'timed' when include is 'all'", () => {
    const timed = makeEvent(new Date(2022, 2, 15, 9), new Date(2022, 2, 15, 10))

    const [segment] = layoutSegments([timed], week, "all")

    expect(segment).toMatchObject({ kind: "timed", startCol: 1, endCol: 1 })
  })

  it("gives a timed event a later row than a span occupying the same day", () => {
    const span = makeEvent(week[0]!, addDays(week[0]!, 2), { allDay: true, name: "Span" })
    const timed = makeEvent(new Date(2022, 2, 14, 9), new Date(2022, 2, 14, 10), { name: "Timed" })

    const segments = layoutSegments([span, timed], week, "all")
    const byName = new Map(segments.map((segment) => [segment.event.name, segment.row]))

    expect(byName.get("Span")).toBe(0)
    expect(byName.get("Timed")).toBeGreaterThan(0)
  })

  it("drops a span that only covers hidden weekend days", () => {
    const saturday = week[5]!
    const event = makeEvent(saturday, addDays(saturday, 2), { allDay: true })

    const segments = layoutSegments([event], weekdays, "spans")

    expect(segments).toHaveLength(0)
  })

  it("maps a Friday-to-Monday span onto the last visible Friday column with continuesAfter", () => {
    const friday = weekdays[4]!
    const event = makeEvent(friday, addDays(friday, 3), { allDay: true }) // Fri -> next Mon

    const [segment] = layoutSegments([event], weekdays, "spans")

    expect(segment).toMatchObject({ startCol: 4, endCol: 4, continuesAfter: true })
  })
})

describe("limitRows", () => {
  /** Builds a placed segment directly, so limitRows is tested against known rows rather than layoutSegments' sort order. */
  function makeSegment(startCol: number, endCol: number, row: number, name: string): Segment<unknown> {
    const event = makeEvent(week[0]!, addDays(week[0]!, 1), { name })
    return { event, startCol, endCol, row, continuesBefore: false, continuesAfter: false, kind: "span" }
  }

  it("hides segments at or past maxRows and reports per-column overflow", () => {
    const rowZero = makeSegment(0, 0, 0, "Row0")
    const rowOne = makeSegment(1, 1, 1, "Row1")
    const hiddenThreeDaySpan = makeSegment(0, 2, 2, "Hidden")

    const { visible, overflow } = limitRows([rowZero, rowOne, hiddenThreeDaySpan], 2, week.length)

    expect(visible.map((segment) => segment.event.name)).toEqual(["Row0", "Row1"])
    expect(overflow).toEqual([1, 1, 1, 0, 0, 0, 0])
  })
})
