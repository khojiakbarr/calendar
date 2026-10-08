import { describe, expect, it } from "vitest"
import {
  formatDateInput,
  formatDayMonth,
  formatFullDate,
  formatMonth,
  formatTime,
  formatTimeInput,
  formatTimeRange,
  formatMonthYear,
  formatTitle,
  formatWeekday,
  parseDateTimeInputs,
  uses12Hour,
} from "./format"

describe("uses12Hour", () => {
  it("is true for en-US", () => {
    expect(uses12Hour("en-US")).toBe(true)
  })

  it("is false for ru-RU", () => {
    expect(uses12Hour("ru-RU")).toBe(false)
  })
})

describe("formatTime", () => {
  it("formats an on-the-hour time without minutes in en-US", () => {
    expect(formatTime(new Date(2022, 2, 15, 9, 0), "en-US")).toBe("9 AM")
  })

  it("formats a half-hour time with minutes in en-US", () => {
    expect(formatTime(new Date(2022, 2, 15, 9, 30), "en-US")).toBe("9:30 AM")
  })

  it("formats noon as 12 PM in en-US", () => {
    expect(formatTime(new Date(2022, 2, 15, 12, 0), "en-US")).toBe("12 PM")
  })

  it("formats midnight as 12 AM in en-US", () => {
    expect(formatTime(new Date(2022, 2, 15, 0, 0), "en-US")).toBe("12 AM")
  })

  it("formats an on-the-hour time in 24-hour form in ru-RU", () => {
    expect(formatTime(new Date(2022, 2, 15, 9, 0), "ru-RU")).toBe("09:00")
  })

  it("formats a half-hour time in 24-hour form in ru-RU", () => {
    expect(formatTime(new Date(2022, 2, 15, 9, 30), "ru-RU")).toBe("09:30")
  })
})

describe("formatTimeRange", () => {
  it("joins two formatted times with an en dash", () => {
    const start = new Date(2022, 2, 15, 9, 0)
    const end = new Date(2022, 2, 15, 10, 0)

    expect(formatTimeRange(start, end, "ru-RU")).toBe("09:00 – 10:00")
  })
})

describe("formatTitle", () => {
  it("formats the day view as a short month, day and year", () => {
    expect(formatTitle("day", new Date(2022, 2, 15), "en-US")).toBe("Mar 15, 2022")
  })

  it("formats the week view as month and year", () => {
    expect(formatTitle("week", new Date(2022, 2, 15), "en-US")).toBe("March 2022")
  })

  it("formats the month view as month and year", () => {
    expect(formatTitle("month", new Date(2022, 2, 15), "en-US")).toBe("March 2022")
  })

  it("formats the agenda view as month and year", () => {
    expect(formatTitle("agenda", new Date(2022, 2, 15), "en-US")).toBe("March 2022")
  })

  it("formats the year view as just the year", () => {
    expect(formatTitle("year", new Date(2022, 2, 15), "en-US")).toBe("2022")
  })
})

describe("formatWeekday", () => {
  it("formats a narrow weekday", () => {
    expect(formatWeekday(new Date(2022, 2, 15), "en-US", "narrow")).toBe("T")
  })

  it("formats a short weekday", () => {
    expect(formatWeekday(new Date(2022, 2, 15), "en-US", "short")).toBe("Tue")
  })

  it("formats a long weekday", () => {
    expect(formatWeekday(new Date(2022, 2, 15), "en-US", "long")).toBe("Tuesday")
  })
})

describe("formatMonth", () => {
  it("formats a short month", () => {
    expect(formatMonth(new Date(2022, 2, 15), "en-US", "short")).toBe("Mar")
  })

  it("formats a long month", () => {
    expect(formatMonth(new Date(2022, 2, 15), "en-US", "long")).toBe("March")
  })
})

describe("formatDayMonth", () => {
  it("formats the short month and day", () => {
    expect(formatDayMonth(new Date(2022, 2, 15), "en-US")).toBe("Mar 15")
  })
})

describe("formatFullDate", () => {
  it("formats the weekday, month, day and year", () => {
    expect(formatFullDate(new Date(2022, 2, 15), "en-US")).toBe("Tuesday, March 15, 2022")
  })
})

describe("formatDateInput", () => {
  it("formats a date as zero-padded YYYY-MM-DD in local time", () => {
    expect(formatDateInput(new Date(2022, 2, 5))).toBe("2022-03-05")
  })
})

describe("formatTimeInput", () => {
  it("formats a time as zero-padded HH:MM in local time", () => {
    expect(formatTimeInput(new Date(2022, 2, 15, 9, 5))).toBe("09:05")
  })
})

describe("parseDateTimeInputs", () => {
  it("parses valid date and time strings into a local Date", () => {
    const result = parseDateTimeInputs("2022-03-15", "09:30")

    expect(result).toEqual(new Date(2022, 2, 15, 9, 30))
  })

  it("returns null for a malformed date string", () => {
    expect(parseDateTimeInputs("2022-3-15", "09:30")).toBeNull()
  })

  it("returns null for a malformed time string", () => {
    expect(parseDateTimeInputs("2022-03-15", "9:30")).toBeNull()
  })

  it("returns null for a day that does not exist, such as Feb 30", () => {
    expect(parseDateTimeInputs("2022-02-30", "09:30")).toBeNull()
  })

  it("returns null for an empty date", () => {
    expect(parseDateTimeInputs("", "09:30")).toBeNull()
  })

  it("returns null for an empty time", () => {
    expect(parseDateTimeInputs("2022-03-15", "")).toBeNull()
  })
})

describe("formatMonthYear", () => {
  it("drops the year word Russian writes after the year", () => {
    expect(formatMonthYear(new Date(2026, 9, 1), "ru")).toBe("октябрь 2026")
  })

  it("keeps a language whose month follows the year whole", () => {
    expect(formatMonthYear(new Date(2026, 9, 1), "en-US")).toBe("October 2026")
    expect(formatMonthYear(new Date(2026, 9, 1), "zh-CN")).toBe(new Intl.DateTimeFormat("zh-CN", { month: "long", year: "numeric" }).format(new Date(2026, 9, 1)))
  })
})
