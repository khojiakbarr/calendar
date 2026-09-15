import { describe, expect, it } from "vitest"
import {
  addDays,
  addMinutes,
  addMonths,
  addYears,
  clampRange,
  differenceInCalendarDays,
  eachDay,
  isMultiDay,
  isSameDay,
  isSameMonth,
  isWeekend,
  isoWeek,
  maxDate,
  minDate,
  minutesOfDay,
  overlaps,
  snapTo,
  spansWholeDays,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  withMinutesOfDay,
} from "./date"

// Fixed so DST-boundary assertions below are meaningful regardless of the
// host machine's default zone.
process.env.TZ = "America/New_York"

describe("startOfDay", () => {
  it("zeroes the time of day without changing the calendar day", () => {
    const d = new Date(2022, 2, 15, 14, 37, 9)

    const result = startOfDay(d)

    expect(result).toEqual(new Date(2022, 2, 15, 0, 0, 0, 0))
  })

  it("does not mutate the Date it was given", () => {
    const d = new Date(2022, 2, 15, 14, 37)

    startOfDay(d)

    expect(d.getHours()).toBe(14)
  })
})

describe("addDays", () => {
  it("preserves the local time of day across a DST spring-forward boundary", () => {
    // Arrange: the day before America/New_York's clocks skip 2 AM → 3 AM
    const beforeSpringForward = new Date(2022, 2, 12, 9, 0)

    // Act
    const result = addDays(beforeSpringForward, 1)

    // Assert: still 9 AM local time on the 13th, not shifted by the missing hour
    expect(result).toEqual(new Date(2022, 2, 13, 9, 0))
  })

  it("preserves the local time of day across a DST fall-back boundary", () => {
    const beforeFallBack = new Date(2022, 10, 5, 9, 0)

    const result = addDays(beforeFallBack, 1)

    expect(result).toEqual(new Date(2022, 10, 6, 9, 0))
  })

  it("rolls over into the next month", () => {
    const result = addDays(new Date(2022, 2, 31), 1)

    expect(result).toEqual(new Date(2022, 3, 1))
  })

  it("subtracts days when n is negative", () => {
    const result = addDays(new Date(2022, 2, 1), -1)

    expect(result).toEqual(new Date(2022, 1, 28))
  })
})

describe("addMonths", () => {
  it("clamps to the last day of a shorter target month", () => {
    const result = addMonths(new Date(2022, 0, 31), 1)

    expect(result).toEqual(new Date(2022, 1, 28))
  })

  it("clamps to Feb 29 in a leap year", () => {
    const result = addMonths(new Date(2020, 0, 31), 1)

    expect(result).toEqual(new Date(2020, 1, 29))
  })

  it("does not clamp when the target month has enough days", () => {
    const result = addMonths(new Date(2022, 2, 15), 1)

    expect(result).toEqual(new Date(2022, 3, 15))
  })
})

describe("addYears", () => {
  it("shifts the year, keeping month and day", () => {
    const result = addYears(new Date(2022, 2, 15), 1)

    expect(result).toEqual(new Date(2023, 2, 15))
  })

  it("clamps Feb 29 to Feb 28 in a non-leap target year", () => {
    const result = addYears(new Date(2020, 1, 29), 1)

    expect(result).toEqual(new Date(2021, 1, 28))
  })
})

describe("addMinutes", () => {
  it("adds minutes, rolling over into the next hour", () => {
    const result = addMinutes(new Date(2022, 2, 15, 9, 45), 30)

    expect(result).toEqual(new Date(2022, 2, 15, 10, 15))
  })
})

describe("startOfWeek", () => {
  it("returns the Sunday of the week when weekStartsOn is 0", () => {
    const tuesday = new Date(2022, 2, 15)

    const result = startOfWeek(tuesday, 0)

    expect(result).toEqual(new Date(2022, 2, 13))
  })

  it("returns the Monday of the week when weekStartsOn is 1", () => {
    const tuesday = new Date(2022, 2, 15)

    const result = startOfWeek(tuesday, 1)

    expect(result).toEqual(new Date(2022, 2, 14))
  })

  it("rolls a Sunday back to the prior Monday when weekStartsOn is 1", () => {
    const sunday = new Date(2022, 2, 13)

    const result = startOfWeek(sunday, 1)

    expect(result).toEqual(new Date(2022, 2, 7))
  })

  it("returns the same day when it already is the week start", () => {
    const monday = new Date(2022, 2, 14, 10, 0)

    const result = startOfWeek(monday, 1)

    expect(result).toEqual(new Date(2022, 2, 14))
  })
})

describe("startOfMonth", () => {
  it("returns the 1st of the month at midnight", () => {
    const result = startOfMonth(new Date(2022, 2, 15, 10, 30))

    expect(result).toEqual(new Date(2022, 2, 1))
  })
})

describe("startOfYear", () => {
  it("returns January 1st at midnight", () => {
    const result = startOfYear(new Date(2022, 5, 15))

    expect(result).toEqual(new Date(2022, 0, 1))
  })
})

describe("isSameDay", () => {
  it("is true for the same calendar day at different times", () => {
    expect(isSameDay(new Date(2022, 2, 15, 1, 0), new Date(2022, 2, 15, 23, 0))).toBe(true)
  })

  it("is false for different days", () => {
    expect(isSameDay(new Date(2022, 2, 15), new Date(2022, 2, 16))).toBe(false)
  })
})

describe("isSameMonth", () => {
  it("is true for different days in the same month", () => {
    expect(isSameMonth(new Date(2022, 2, 1), new Date(2022, 2, 28))).toBe(true)
  })

  it("is false across a month boundary", () => {
    expect(isSameMonth(new Date(2022, 2, 31), new Date(2022, 3, 1))).toBe(false)
  })
})

describe("isWeekend", () => {
  it("is true for Saturday and Sunday", () => {
    expect(isWeekend(new Date(2022, 2, 19))).toBe(true) // Saturday
    expect(isWeekend(new Date(2022, 2, 20))).toBe(true) // Sunday
  })

  it("is false for a weekday", () => {
    expect(isWeekend(new Date(2022, 2, 15))).toBe(false) // Tuesday
  })
})

describe("differenceInCalendarDays", () => {
  it("counts whole calendar days between two dates", () => {
    expect(differenceInCalendarDays(new Date(2022, 2, 20), new Date(2022, 2, 15))).toBe(5)
  })

  it("is unaffected by a DST transition between the two dates", () => {
    // Arrange: spans America/New_York's spring-forward, a literal 23-hour day
    const before = new Date(2022, 2, 12, 9, 0)
    const after = new Date(2022, 2, 13, 9, 0)

    expect(differenceInCalendarDays(after, before)).toBe(1)
  })

  it("returns a negative number when later is before earlier", () => {
    expect(differenceInCalendarDays(new Date(2022, 2, 15), new Date(2022, 2, 20))).toBe(-5)
  })
})

describe("eachDay", () => {
  it("returns one entry per day of a full month range", () => {
    const days = eachDay({ start: new Date(2022, 3, 1), end: new Date(2022, 4, 1) })

    expect(days).toHaveLength(30)
    expect(days[0]).toEqual(new Date(2022, 3, 1))
    expect(days[29]).toEqual(new Date(2022, 3, 30))
  })

  it("does not include the day of an end that lands exactly at midnight", () => {
    const days = eachDay({ start: new Date(2022, 2, 15), end: new Date(2022, 2, 16) })

    expect(days).toEqual([new Date(2022, 2, 15)])
  })

  it("includes a partial final day", () => {
    const days = eachDay({ start: new Date(2022, 2, 15, 9, 0), end: new Date(2022, 2, 16, 1, 0) })

    expect(days).toEqual([new Date(2022, 2, 15), new Date(2022, 2, 16)])
  })
})

describe("minutesOfDay", () => {
  it("returns 0 at midnight", () => {
    expect(minutesOfDay(new Date(2022, 2, 15, 0, 0))).toBe(0)
  })

  it("returns 1439 one minute before midnight", () => {
    expect(minutesOfDay(new Date(2022, 2, 15, 23, 59))).toBe(1439)
  })

  it("combines hours and minutes", () => {
    expect(minutesOfDay(new Date(2022, 2, 15, 9, 30))).toBe(570)
  })
})

describe("withMinutesOfDay", () => {
  it("returns the day at the given number of minutes past midnight", () => {
    const result = withMinutesOfDay(new Date(2022, 2, 15, 13, 0), 570)

    expect(result).toEqual(new Date(2022, 2, 15, 9, 30))
  })

  it("rolls over into the next day when minutes is 1440", () => {
    const result = withMinutesOfDay(new Date(2022, 2, 15), 1440)

    expect(result).toEqual(new Date(2022, 2, 16, 0, 0))
  })
})

describe("snapTo", () => {
  it("rounds down to the nearer step", () => {
    expect(snapTo(22, 15)).toBe(15)
  })

  it("rounds up to the nearer step", () => {
    expect(snapTo(23, 15)).toBe(30)
  })

  it("leaves an exact multiple unchanged", () => {
    expect(snapTo(30, 15)).toBe(30)
  })
})

describe("overlaps", () => {
  it("is true when the ranges intersect", () => {
    const a = { start: new Date(2022, 2, 15, 9, 0), end: new Date(2022, 2, 15, 11, 0) }
    const b = { start: new Date(2022, 2, 15, 10, 0), end: new Date(2022, 2, 15, 12, 0) }

    expect(overlaps(a, b)).toBe(true)
  })

  it("is false when a ends exactly where b starts (half-open)", () => {
    const a = { start: new Date(2022, 2, 15, 9, 0), end: new Date(2022, 2, 15, 10, 0) }
    const b = { start: new Date(2022, 2, 15, 10, 0), end: new Date(2022, 2, 15, 11, 0) }

    expect(overlaps(a, b)).toBe(false)
  })

  it("is false when the ranges are disjoint", () => {
    const a = { start: new Date(2022, 2, 15, 9, 0), end: new Date(2022, 2, 15, 10, 0) }
    const b = { start: new Date(2022, 2, 16, 9, 0), end: new Date(2022, 2, 16, 10, 0) }

    expect(overlaps(a, b)).toBe(false)
  })
})

describe("clampRange", () => {
  it("returns the intersection of two overlapping ranges", () => {
    const inner = { start: new Date(2022, 2, 15, 9, 0), end: new Date(2022, 2, 15, 12, 0) }
    const outer = { start: new Date(2022, 2, 15, 10, 0), end: new Date(2022, 2, 15, 11, 0) }

    expect(clampRange(inner, outer)).toEqual(outer)
  })

  it("returns null when the ranges do not overlap", () => {
    const inner = { start: new Date(2022, 2, 15), end: new Date(2022, 2, 16) }
    const outer = { start: new Date(2022, 2, 20), end: new Date(2022, 2, 21) }

    expect(clampRange(inner, outer)).toBeNull()
  })
})

describe("isMultiDay", () => {
  it("is false when the event ends exactly at the next midnight", () => {
    const event = { start: new Date(2022, 2, 15, 9, 0), end: new Date(2022, 2, 16, 0, 0) }

    expect(isMultiDay(event)).toBe(false)
  })

  it("is true when the event ends one minute past the next midnight", () => {
    const event = { start: new Date(2022, 2, 15, 9, 0), end: new Date(2022, 2, 16, 0, 1) }

    expect(isMultiDay(event)).toBe(true)
  })

  it("is false for an event entirely within one day", () => {
    const event = { start: new Date(2022, 2, 15, 9, 0), end: new Date(2022, 2, 15, 10, 0) }

    expect(isMultiDay(event)).toBe(false)
  })
})

describe("spansWholeDays", () => {
  it("is true for a single-day all-day event", () => {
    const event = { start: new Date(2022, 2, 15), end: new Date(2022, 2, 16), allDay: true }

    expect(spansWholeDays(event)).toBe(true)
  })

  it("is true for a timed event crossing midnight, even without allDay", () => {
    const event = { start: new Date(2022, 2, 15, 23, 0), end: new Date(2022, 2, 16, 1, 0) }

    expect(spansWholeDays(event)).toBe(true)
  })

  it("is false for a same-day timed event", () => {
    const event = { start: new Date(2022, 2, 15, 9, 0), end: new Date(2022, 2, 15, 10, 0) }

    expect(spansWholeDays(event)).toBe(false)
  })
})

describe("isoWeek", () => {
  it("returns 11 for 2022-03-15", () => {
    expect(isoWeek(new Date(2022, 2, 15))).toBe(11)
  })

  it("returns 53 for 2021-01-03, which belongs to the last ISO week of 2020", () => {
    expect(isoWeek(new Date(2021, 0, 3))).toBe(53)
  })

  it("returns 1 for the first Monday of an ISO year", () => {
    expect(isoWeek(new Date(2022, 0, 3))).toBe(1)
  })
})

describe("maxDate", () => {
  it("returns the later of the two dates", () => {
    const a = new Date(2022, 2, 15)
    const b = new Date(2022, 2, 20)

    expect(maxDate(a, b)).toEqual(b)
    expect(maxDate(b, a)).toEqual(b)
  })
})

describe("minDate", () => {
  it("returns the earlier of the two dates", () => {
    const a = new Date(2022, 2, 15)
    const b = new Date(2022, 2, 20)

    expect(minDate(a, b)).toEqual(a)
    expect(minDate(b, a)).toEqual(a)
  })
})
