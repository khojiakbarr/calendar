import { describe, expect, it } from "vitest"
import { differenceInCalendarDays } from "./date"
import { loadWindow, shiftDate, visibleDays, visibleRange } from "./range"

describe("visibleRange", () => {
  it("returns the single day for the day view", () => {
    const date = new Date(2022, 2, 15, 10, 30)

    const range = visibleRange("day", date, 1)

    expect(range).toEqual({ start: new Date(2022, 2, 15), end: new Date(2022, 2, 16) })
  })

  it("returns a 7-day window starting on weekStartsOn for the week view", () => {
    const tuesday = new Date(2022, 2, 15)

    const range = visibleRange("week", tuesday, 1)

    expect(range.start).toEqual(new Date(2022, 2, 14)) // Monday
    expect(differenceInCalendarDays(range.end, range.start)).toBe(7)
  })

  it("always returns a 42-day grid for the month view, even in a short month", () => {
    const february = new Date(2022, 1, 15)

    const range = visibleRange("month", february, 1)

    expect(differenceInCalendarDays(range.end, range.start)).toBe(42)
  })

  it("aligns the month grid to the week start before the 1st", () => {
    // March 2022 starts on a Tuesday, so a Monday-first grid begins Feb 28.
    const march = new Date(2022, 2, 15)

    const range = visibleRange("month", march, 1)

    expect(range.start).toEqual(new Date(2022, 1, 28))
  })

  it("returns a full calendar year for the year view", () => {
    const date = new Date(2022, 5, 1)

    const range = visibleRange("year", date, 1)

    expect(range).toEqual({ start: new Date(2022, 0, 1), end: new Date(2023, 0, 1) })
  })

  it("returns a full month for the agenda view", () => {
    const date = new Date(2022, 2, 15)

    const range = visibleRange("agenda", date, 1)

    expect(range).toEqual({ start: new Date(2022, 2, 1), end: new Date(2022, 3, 1) })
  })
})

describe("visibleDays", () => {
  it("returns 1 day for the day view", () => {
    expect(visibleDays("day", new Date(2022, 2, 15), 1, true)).toEqual([new Date(2022, 2, 15)])
  })

  it("returns 7 days for the week view with weekends shown", () => {
    expect(visibleDays("week", new Date(2022, 2, 15), 1, true)).toHaveLength(7)
  })

  it("returns 5 days for the week view without weekends", () => {
    const days = visibleDays("week", new Date(2022, 2, 15), 1, false)

    expect(days).toHaveLength(5)
    expect(days.every((day) => day.getDay() !== 0 && day.getDay() !== 6)).toBe(true)
  })

  it("returns 42 days for the month view with weekends shown", () => {
    expect(visibleDays("month", new Date(2022, 2, 15), 1, true)).toHaveLength(42)
  })

  it("returns 30 days for the month view without weekends", () => {
    expect(visibleDays("month", new Date(2022, 2, 15), 1, false)).toHaveLength(30)
  })

  it("returns no day cells for the year view", () => {
    expect(visibleDays("year", new Date(2022, 2, 15), 1, true)).toEqual([])
  })

  it("returns one entry per day of the month for the agenda view", () => {
    // April has 30 days
    expect(visibleDays("agenda", new Date(2022, 3, 15), 1, true)).toHaveLength(30)
  })
})

describe("shiftDate", () => {
  it("moves by one day for the day view", () => {
    expect(shiftDate("day", new Date(2022, 2, 15), 1)).toEqual(new Date(2022, 2, 16))
  })

  it("moves back one day for the day view", () => {
    expect(shiftDate("day", new Date(2022, 2, 15), -1)).toEqual(new Date(2022, 2, 14))
  })

  it("moves by seven days for the week view", () => {
    expect(shiftDate("week", new Date(2022, 2, 15), 1)).toEqual(new Date(2022, 2, 22))
  })

  it("moves by one month for the month view, clamping the day", () => {
    expect(shiftDate("month", new Date(2022, 0, 31), 1)).toEqual(new Date(2022, 1, 28))
  })

  it("moves by one year for the year view", () => {
    expect(shiftDate("year", new Date(2022, 2, 15), 1)).toEqual(new Date(2023, 2, 15))
  })

  it("moves by one month for the agenda view", () => {
    expect(shiftDate("agenda", new Date(2022, 2, 15), -1)).toEqual(new Date(2022, 1, 15))
  })
})

describe("loadWindow", () => {
  it("expands a single day to the whole week it falls in", () => {
    // Arrange: Tuesday, so [start, +1d) is nowhere near a week boundary
    const range = { start: new Date(2022, 2, 15), end: new Date(2022, 2, 16) }

    const window = loadWindow(range, 1)

    expect(window).toEqual({ start: new Date(2022, 2, 14), end: new Date(2022, 2, 21) })
  })

  it("leaves a range that already spans whole weeks unchanged", () => {
    const range = { start: new Date(2022, 2, 14), end: new Date(2022, 2, 21) }

    const window = loadWindow(range, 1)

    expect(window).toEqual(range)
  })

  it("expands the 42-day month grid to the same range when weeks already align", () => {
    const monthRange = visibleRange("month", new Date(2022, 2, 15), 1)

    const window = loadWindow(monthRange, 1)

    expect(window).toEqual(monthRange)
  })
})
