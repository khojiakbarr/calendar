import type { DateRange, WeekDay } from "../types"

/**
 * Milliseconds in a calendar day, used only for diffing two UTC-normalised
 * midnights (never for building a new local `Date`, where DST would corrupt
 * the result).
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Midnight of the given day, in local time. Does not mutate `d`. */
export function startOfDay(d: Date): Date {
  const result = new Date(d)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * `d` shifted by `n` calendar days.
 *
 * Uses `setDate` rather than adding `n * 86400000` ms so a shift across a
 * DST boundary keeps the same wall-clock time instead of landing an hour
 * off.
 */
export function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}

/**
 * `d` shifted by `n` calendar months, clamping the day of month when the
 * target month is shorter (Jan 31 + 1 month → Feb 28, or 29 in a leap year).
 */
export function addMonths(d: Date, n: number): Date {
  const result = new Date(d)
  const day = result.getDate()
  result.setDate(1) // pin to a day that exists in every month before shifting
  result.setMonth(result.getMonth() + n)
  const daysInTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(day, daysInTargetMonth))
  return result
}

/** `d` shifted by `n` years, with the same day-clamping rule as {@link addMonths} (Feb 29 → Feb 28). */
export function addYears(d: Date, n: number): Date {
  return addMonths(d, n * 12)
}

/** `d` shifted by `n` minutes. */
export function addMinutes(d: Date, n: number): Date {
  const result = new Date(d)
  result.setMinutes(result.getMinutes() + n)
  return result
}

/**
 * The first day of the week containing `d`.
 *
 * @param weekStartsOn - `0` for Sunday-first weeks, `1` for Monday-first, etc.
 */
export function startOfWeek(d: Date, weekStartsOn: WeekDay): Date {
  const day = d.getDay()
  const daysSinceWeekStart = (day - weekStartsOn + 7) % 7
  return addDays(startOfDay(d), -daysSinceWeekStart)
}

/** The 1st of `d`'s month, at midnight. */
export function startOfMonth(d: Date): Date {
  const result = startOfDay(d)
  result.setDate(1)
  return result
}

/** January 1st of `d`'s year, at midnight. */
export function startOfYear(d: Date): Date {
  const result = startOfDay(d)
  result.setMonth(0, 1)
  return result
}

/** Whether `a` and `b` fall on the same calendar day, in local time. */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Whether `a` and `b` fall in the same calendar month. */
export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

/** Whether `d` is a Saturday or Sunday. */
export function isWeekend(d: Date): boolean {
  const day = d.getDay()
  return day === 0 || day === 6
}

/**
 * The number of calendar days between `earlier` and `later` (may be negative).
 *
 * Computed from `Date.UTC` of each date's year/month/day rather than a raw ms
 * subtraction of the local dates, so a DST transition between them (a 23h or
 * 25h day) can never throw the count off by one.
 */
export function differenceInCalendarDays(later: Date, earlier: Date): number {
  const laterUtc = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate())
  const earlierUtc = Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate())
  return Math.round((laterUtc - earlierUtc) / MS_PER_DAY)
}

/**
 * Start-of-day for every calendar day the half-open `range` touches.
 *
 * The end of a half-open range is exclusive, so a range ending exactly at
 * midnight does not touch that midnight's day — only the one before it.
 */
export function eachDay(range: DateRange): Date[] {
  const first = startOfDay(range.start)
  const endIsMidnight = range.end.getTime() === startOfDay(range.end).getTime()
  const last = endIsMidnight ? addDays(startOfDay(range.end), -1) : startOfDay(range.end)
  const count = differenceInCalendarDays(last, first) + 1
  const days: Date[] = []
  for (let i = 0; i < count; i++) {
    days.push(addDays(first, i))
  }
  return days
}

/** Minutes elapsed since local midnight, `0..1439`. */
export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

/** `day` at `minutes` past its midnight; `minutes` may be `1440` to mean the following midnight. */
export function withMinutesOfDay(day: Date, minutes: number): Date {
  const result = startOfDay(day)
  result.setMinutes(result.getMinutes() + minutes)
  return result
}

/** `minutes` rounded to the nearest multiple of `step`. */
export function snapTo(minutes: number, step: number): number {
  return Math.round(minutes / step) * step
}

/** Whether half-open ranges `a` and `b` share any instant. */
export function overlaps(a: DateRange, b: DateRange): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime()
}

/** The overlap of `inner` and `outer`, or `null` when they do not overlap. */
export function clampRange(inner: DateRange, outer: DateRange): DateRange | null {
  if (!overlaps(inner, outer)) return null
  const start = maxDate(inner.start, outer.start)
  const end = minDate(inner.end, outer.end)
  return start.getTime() < end.getTime() ? { start, end } : null
}

/**
 * Whether `event` touches more than one calendar day.
 *
 * `end` is exclusive, so an event ending exactly at the next midnight is
 * still single-day (it never touches the next day); one minute later, it is.
 */
export function isMultiDay(event: { start: Date; end: Date }): boolean {
  const startDay = startOfDay(event.start)
  const endIsMidnight = event.end.getTime() === startOfDay(event.end).getTime()
  const lastDay = endIsMidnight ? addDays(startOfDay(event.end), -1) : startOfDay(event.end)
  return lastDay.getTime() > startDay.getTime()
}

/** Whether `event` should render as a whole-day bar rather than a timed block. */
export function spansWholeDays(event: { start: Date; end: Date; allDay?: boolean }): boolean {
  return event.allDay === true || isMultiDay(event)
}

/** The Thursday of the ISO week containing `d`; the ISO week's year is that Thursday's year. */
function isoThursday(d: Date): Date {
  const date = startOfDay(d)
  const isoDayIndex = (date.getDay() + 6) % 7 // Monday = 0 … Sunday = 6
  return addDays(date, 3 - isoDayIndex)
}

/** The ISO-8601 week number (1-53) of `d`. */
export function isoWeek(d: Date): number {
  const thursday = isoThursday(d)
  const firstThursday = isoThursday(new Date(thursday.getFullYear(), 0, 4))
  return 1 + differenceInCalendarDays(thursday, firstThursday) / 7
}

/** The later of `a` and `b`. */
export function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? new Date(a) : new Date(b)
}

/** The earlier of `a` and `b`. */
export function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? new Date(a) : new Date(b)
}
