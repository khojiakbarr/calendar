import type { CalendarEvent, CalendarLabels, DateRange } from "../../types"
import { addDays, eachDay, isMultiDay, overlaps, spansWholeDays } from "../../core/date"
import { formatDayMonth } from "../../core/format"

/** One calendar day's events, already split into whole-day spans and timed events, each in start order. */
export interface AgendaDayGroup<TData = unknown> {
  day: Date
  spans: CalendarEvent<TData>[]
  timed: CalendarEvent<TData>[]
}

/**
 * Buckets `events` under each day of `days` that they touch.
 *
 * A multi-day event appears under every day it overlaps, not only the day it
 * starts on, so nothing on the agenda looks like it vanished mid-span. Days
 * with nothing scheduled are left out of the result entirely — the caller
 * renders exactly what comes back, no empty-day filtering of its own.
 *
 * @param days - Start-of-day dates to group under, in order.
 * @param events - Events to place; each appears under every day it overlaps.
 */
export function groupEventsByDay<TData>(days: Date[], events: CalendarEvent<TData>[]): AgendaDayGroup<TData>[] {
  return days.map((day) => buildDayGroup(day, events)).filter((group) => group.spans.length > 0 || group.timed.length > 0)
}

function buildDayGroup<TData>(day: Date, events: CalendarEvent<TData>[]): AgendaDayGroup<TData> {
  const dayRange: DateRange = { start: day, end: addDays(day, 1) }
  const dayEvents = events.filter((event) => overlaps(event, dayRange))
  const spans = dayEvents.filter((event) => spansWholeDays(event)).sort(compareByStart)
  const timed = dayEvents.filter((event) => !spansWholeDays(event)).sort(compareByStart)
  return { day, spans, timed }
}

function compareByStart<TData>(a: CalendarEvent<TData>, b: CalendarEvent<TData>): number {
  return a.start.getTime() - b.start.getTime()
}

/**
 * The text shown on a whole-day pill: `labels.allDay` for an event confined
 * to one day, or its date range for one that spans several.
 */
export function spanLabel<TData>(event: CalendarEvent<TData>, labels: CalendarLabels, locale: string): string {
  if (!isMultiDay(event)) return labels.allDay
  const touchedDays = eachDay(event)
  const lastDay = touchedDays.at(-1) ?? event.start
  return `${formatDayMonth(event.start, locale)} – ${formatDayMonth(lastDay, locale)}`
}
