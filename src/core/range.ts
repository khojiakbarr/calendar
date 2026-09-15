import type { CalendarView, DateRange, WeekDay } from "../types"
import { addDays, addMonths, addYears, eachDay, isWeekend, startOfDay, startOfMonth, startOfWeek, startOfYear } from "./date"

/**
 * The half-open interval a view covers for its currently anchored `date`.
 *
 * `month` always returns a 6-week (42-day) grid — like Bryntum, the extra
 * days from the neighbouring months are part of the view, not an overflow
 * case callers need to special-case.
 */
export function visibleRange(view: CalendarView, date: Date, weekStartsOn: WeekDay): DateRange {
  switch (view) {
    case "day": {
      const start = startOfDay(date)
      return { start, end: addDays(start, 1) }
    }
    case "week": {
      const start = startOfWeek(date, weekStartsOn)
      return { start, end: addDays(start, 7) }
    }
    case "month": {
      const start = startOfWeek(startOfMonth(date), weekStartsOn)
      return { start, end: addDays(start, 42) }
    }
    case "year": {
      const start = startOfYear(date)
      return { start, end: addYears(start, 1) }
    }
    case "agenda": {
      const start = startOfMonth(date)
      return { start, end: addMonths(start, 1) }
    }
    default: {
      const exhaustive: never = view
      throw new Error(`Unknown view: ${String(exhaustive)}`)
    }
  }
}

/** `days`, with Saturdays and Sundays removed unless `showWeekends` is true. */
function filterWeekends(days: Date[], showWeekends: boolean): Date[] {
  return showWeekends ? days : days.filter((day) => !isWeekend(day))
}

/**
 * The individual day cells/columns a view draws, in order.
 *
 * `day` is always 1 day, `year` never has day cells of its own (its mini
 * months compute their own), and `week`/`month` shrink when weekends are
 * hidden (7→5, 42→30).
 */
export function visibleDays(view: CalendarView, date: Date, weekStartsOn: WeekDay, showWeekends: boolean): Date[] {
  switch (view) {
    case "day":
      return [startOfDay(date)]
    case "week":
      return filterWeekends(eachDay(visibleRange("week", date, weekStartsOn)), showWeekends)
    case "month":
      return filterWeekends(eachDay(visibleRange("month", date, weekStartsOn)), showWeekends)
    case "year":
      return []
    case "agenda":
      return eachDay(visibleRange("agenda", date, weekStartsOn))
    default: {
      const exhaustive: never = view
      throw new Error(`Unknown view: ${String(exhaustive)}`)
    }
  }
}

/**
 * The anchor `date` moved one step of `view` in `direction`.
 *
 * `agenda` steps by month, like `month`, since it lists a month at a time.
 */
export function shiftDate(view: CalendarView, date: Date, direction: 1 | -1): Date {
  switch (view) {
    case "day":
      return addDays(date, direction)
    case "week":
      return addDays(date, 7 * direction)
    case "month":
      return addMonths(date, direction)
    case "year":
      return addYears(date, direction)
    case "agenda":
      return addMonths(date, direction)
    default: {
      const exhaustive: never = view
      throw new Error(`Unknown view: ${String(exhaustive)}`)
    }
  }
}

/**
 * `range` expanded outward to whole weeks, so the server is always asked for
 * complete weeks rather than a ragged edge that would need re-fetching the
 * moment the view scrolls half a week further.
 */
export function loadWindow(range: DateRange, weekStartsOn: WeekDay): DateRange {
  const start = startOfWeek(range.start, weekStartsOn)
  const lastTouchedDay = addDays(range.end, -1)
  const end = addDays(startOfWeek(lastTouchedDay, weekStartsOn), 7)
  return { start, end }
}
