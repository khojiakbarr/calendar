import { formatDayMonth, formatTime } from "../../core/format"
import { fill } from "../../core/labels"
import type { Segment } from "../../core/spans"
import type { CalendarLabels } from "../../types"

/**
 * An event's `aria-label` in a month cell or its day card: its name plus its
 * start and end — times for a timed event, dates for a span.
 *
 * @param segment - The event's placement; its `kind` picks times or dates.
 * @param labels - The calendar's words (`eventDescription`, `untitled`).
 * @param locale - Formats the times and dates.
 * @returns e.g. "Standup, 9 AM to 10 AM".
 */
export function describeSegment<TData>(segment: Segment<TData>, labels: CalendarLabels, locale: string): string {
  const { event, kind } = segment
  const start = kind === "timed" ? formatTime(event.start, locale) : formatDayMonth(event.start, locale)
  const end = kind === "timed" ? formatTime(event.end, locale) : formatDayMonth(event.end, locale)
  return fill(labels.eventDescription, { name: event.name || labels.untitled, start, end })
}

/**
 * The segments of a week row that cover one of its columns, in the order the
 * cell stacks them: spans first, then timed events by start.
 *
 * @param segments - Every segment of the row, hidden ones included.
 * @param col - The column (day) asked about.
 */
export function segmentsOfColumn<TData>(segments: readonly Segment<TData>[], col: number): Segment<TData>[] {
  return segments.filter((segment) => segment.startCol <= col && col <= segment.endCol).sort((a, b) => a.row - b.row)
}
