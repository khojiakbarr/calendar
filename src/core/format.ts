import type { CalendarView } from "../types"
import { fallbackWords } from "./localeWords"

const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_INPUT_PATTERN = /^(\d{2}):(\d{2})$/

/** `n` as a string, left-padded with a zero to at least 2 digits. */
function pad2(n: number): string {
  return n.toString().padStart(2, "0")
}

/** Whether `locale` shows the time of day as 12-hour ("9 AM") rather than 24-hour ("09:00"). */
export function uses12Hour(locale: string): boolean {
  const { hourCycle } = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions()
  return hourCycle === "h11" || hourCycle === "h12"
}

/**
 * The time of day, styled the way the locale expects.
 *
 * 12-hour locales drop the minutes when they are `:00` ("9 AM", not
 * "9:00 AM"); 24-hour locales always show them, zero-padded ("09:00").
 */
export function formatTime(d: Date, locale: string): string {
  const hours = d.getHours()
  const minutes = d.getMinutes()
  if (!uses12Hour(locale)) {
    return `${pad2(hours)}:${pad2(minutes)}`
  }
  const dayPeriod = new Intl.DateTimeFormat(locale, { hour: "numeric", hour12: true })
    .formatToParts(d)
    .find((part) => part.type === "dayPeriod")?.value
  const period = dayPeriod ?? (hours < 12 ? "AM" : "PM") // fallback for engines that omit the part
  const displayHour = hours % 12 === 0 ? 12 : hours % 12
  return minutes === 0 ? `${displayHour} ${period}` : `${displayHour}:${pad2(minutes)} ${period}`
}

/** `start`–`end` as a locale-formatted time range, joined with an en dash. */
export function formatTimeRange(start: Date, end: Date, locale: string): string {
  return `${formatTime(start, locale)} – ${formatTime(end, locale)}`
}

/**
 * The toolbar title for `view` anchored on `date`.
 *
 * `day` is specific enough to need the full date; `week`/`month`/`agenda`
 * share a month+year title (the week badge next to it names the week
 * number); `year` needs only the year.
 */
export function formatTitle(view: CalendarView, date: Date, locale: string): string {
  const words = fallbackWords(locale)
  if (words) {
    const month = words.months[date.getMonth()] ?? ""
    if (view === "day") return `${date.getDate()}-${(words.monthsShort[date.getMonth()] ?? "").toLowerCase()}, ${date.getFullYear()}`
    if (view === "year") return String(date.getFullYear())
    return `${month} ${date.getFullYear()}`
  }
  switch (view) {
    case "day":
      return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(date)
    case "week":
    case "month":
    case "agenda":
      return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date)
    case "year":
      return new Intl.DateTimeFormat(locale, { year: "numeric" }).format(date)
    default: {
      const exhaustive: never = view
      throw new Error(`Unknown view: ${String(exhaustive)}`)
    }
  }
}

/**
 * A month and its year, short enough for a narrow header: the month view's
 * title without a trailing year word — «октябрь 2026», not «октябрь 2026 г.».
 * Only a literal that follows the year at the very end is dropped, so a
 * language that writes its month after the year («2026年10月») keeps its form.
 *
 * @example
 * formatMonthYear(new Date(2026, 9, 1), "ru") // "октябрь 2026"
 */
export function formatMonthYear(date: Date, locale: string): string {
  const words = fallbackWords(locale)
  if (words) return `${words.months[date.getMonth()] ?? ""} ${date.getFullYear()}`
  const parts = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).formatToParts(date)
  const last = parts.at(-1)
  const beforeLast = parts.at(-2)
  const trimmed = last?.type === "literal" && beforeLast?.type === "year" ? parts.slice(0, -1) : parts
  return trimmed.map((part) => part.value).join("").trim()
}

/** The weekday name of `d`, e.g. "T" (narrow), "Tue" (short) or "Tuesday" (long). */
export function formatWeekday(d: Date, locale: string, width: "narrow" | "short" | "long"): string {
  const words = fallbackWords(locale)
  if (words) {
    const names = width === "long" ? words.weekdays : width === "short" ? words.weekdaysShort : words.weekdaysNarrow
    return names[d.getDay()] ?? ""
  }
  return new Intl.DateTimeFormat(locale, { weekday: width }).format(d)
}

/** The month name of `d`, e.g. "Mar" (short) or "March" (long). */
export function formatMonth(d: Date, locale: string, width: "short" | "long"): string {
  const words = fallbackWords(locale)
  if (words) return (width === "long" ? words.months : words.monthsShort)[d.getMonth()] ?? ""
  return new Intl.DateTimeFormat(locale, { month: width }).format(d)
}

/** `d` as a short month and day, e.g. "Mar 15" — used for the 1st-of-month label in month view. */
export function formatDayMonth(d: Date, locale: string): string {
  const words = fallbackWords(locale)
  if (words) return `${d.getDate()}-${(words.monthsShort[d.getMonth()] ?? "").toLowerCase()}`
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(d)
}

/** `d` as a full, screen-reader-friendly date, e.g. "Tuesday, March 15, 2022". */
export function formatFullDate(d: Date, locale: string): string {
  const words = fallbackWords(locale)
  if (words) return `${words.weekdays[d.getDay()] ?? ""}, ${d.getDate()}-${(words.months[d.getMonth()] ?? "").toLowerCase()}, ${d.getFullYear()}`
  return new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(d)
}

/** `d`'s local date as `YYYY-MM-DD`, for an `<input type="date">` value. */
export function formatDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** `d`'s local time as `HH:MM`, for an `<input type="time">` value. */
export function formatTimeInput(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/**
 * Parses `<input type="date">` and `<input type="time">` values back into a
 * local `Date`, or `null` when either is malformed or names a day/time that
 * does not exist (e.g. "2022-02-30").
 *
 * `Date`'s constructor silently rolls invalid components into the next
 * month, so the result is round-tripped through its own getters to confirm
 * nothing shifted before trusting it.
 */
export function parseDateTimeInputs(date: string, time: string): Date | null {
  const dateMatch = DATE_INPUT_PATTERN.exec(date)
  const timeMatch = TIME_INPUT_PATTERN.exec(time)
  if (!dateMatch || !timeMatch) return null
  const yearStr = dateMatch[1]
  const monthStr = dateMatch[2]
  const dayStr = dateMatch[3]
  const hourStr = timeMatch[1]
  const minuteStr = timeMatch[2]
  // Capture groups always exist once the pattern matches; this guard exists
  // only to satisfy noUncheckedIndexedAccess without an `as` cast.
  if (yearStr === undefined || monthStr === undefined || dayStr === undefined || hourStr === undefined || minuteStr === undefined) {
    return null
  }
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  const hour = Number(hourStr)
  const minute = Number(minuteStr)
  const result = new Date(year, month - 1, day, hour, minute, 0, 0)
  const isValid =
    result.getFullYear() === year &&
    result.getMonth() === month - 1 &&
    result.getDate() === day &&
    result.getHours() === hour &&
    result.getMinutes() === minute
  return isValid ? result : null
}
