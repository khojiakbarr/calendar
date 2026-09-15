import type { CalendarEvent } from "../types"
import { addDays, overlaps, spansWholeDays } from "./date"

/**
 * One event's placement across a row of day columns — the all-day row, or a
 * month cell's stack of bars/lines.
 *
 * `startCol`/`endCol` are inclusive indexes into the `days` array passed to
 * {@link layoutSegments}, which may skip days (hidden weekends), so they are
 * positions in that array, not day-of-week offsets.
 */
export interface Segment<T> {
  event: CalendarEvent<T>
  startCol: number
  endCol: number
  /** 0-based row within the shared stack; rows are filled first-fit, lowest first. */
  row: number
  /** The event's date range starts before the first day shown, e.g. carried over from last week. */
  continuesBefore: boolean
  /** The event's date range continues past the last day shown. */
  continuesAfter: boolean
  /** `"span"` for all-day/multi-day bars (`spansWholeDays`); `"timed"` for a single-day timed event shown as a line (month cells only). */
  kind: "span" | "timed"
}

/** The `days` indexes whose day-cell overlaps `event`'s range, in ascending order. */
function matchedColumns(event: { start: Date; end: Date }, days: readonly Date[]): number[] {
  const columns: number[] = []
  days.forEach((dayStart, index) => {
    const cell = { start: dayStart, end: addDays(dayStart, 1) }
    if (overlaps({ start: event.start, end: event.end }, cell)) columns.push(index)
  })
  return columns
}

/**
 * Builds the segment for one event against `days`, or `[]` when the event is
 * excluded by `include`, or its range touches none of `days` (e.g. a
 * weekend-only span when weekends are hidden).
 */
function toSegment<T>(
  event: CalendarEvent<T>,
  days: readonly Date[],
  firstDay: Date,
  lastDay: Date,
  include: "spans" | "all",
): Segment<T>[] {
  const isSpan = spansWholeDays(event)
  if (include === "spans" && !isSpan) return []

  const columns = matchedColumns(event, days)
  if (columns.length === 0) return []

  const startCol = Math.min(...columns)
  const endCol = Math.max(...columns)
  const continuesBefore = event.start.getTime() < firstDay.getTime()
  const continuesAfter = event.end.getTime() > addDays(lastDay, 1).getTime()

  return [{ event, startCol, endCol, row: 0, continuesBefore, continuesAfter, kind: isSpan ? "span" : "timed" }]
}

/** Shared tail of both orderings: start time ascending, then name for a stable tie-break. */
function compareByStartThenName<T>(a: Segment<T>, b: Segment<T>): number {
  const byStart = a.event.start.getTime() - b.event.start.getTime()
  return byStart !== 0 ? byStart : a.event.name.localeCompare(b.event.name)
}

/** Span ordering: earlier column first, then longer bars first (they anchor the row), then {@link compareByStartThenName}. */
function compareSpans<T>(a: Segment<T>, b: Segment<T>): number {
  if (a.startCol !== b.startCol) return a.startCol - b.startCol
  const lengthDiff = b.endCol - b.startCol - (a.endCol - a.startCol)
  return lengthDiff !== 0 ? lengthDiff : compareByStartThenName(a, b)
}

/** Whether `interval` [startCol, endCol] is disjoint from every interval already placed in a row. */
function isColumnRangeFree(occupied: ReadonlyArray<readonly [number, number]>, startCol: number, endCol: number): boolean {
  return occupied.every(([s, e]) => endCol < s || startCol > e)
}

/**
 * Places already-ordered segments into rows, first-fit: each segment takes
 * the lowest row whose occupied column ranges do not intersect its own.
 */
function assignRows<T>(segments: readonly Segment<T>[]): Segment<T>[] {
  const rows: Array<Array<readonly [number, number]>> = []
  return segments.map((segment) => {
    let row = 0
    while (row < rows.length && !isColumnRangeFree(rows[row] ?? [], segment.startCol, segment.endCol)) row++
    const existing = rows[row] ?? []
    rows[row] = [...existing, [segment.startCol, segment.endCol]]
    return { ...segment, row }
  })
}

/**
 * Lays out `events` as segments across a row of `days` — the all-day strip
 * (`include: "spans"`) or a month grid's cells (`include: "all"`, which adds
 * single-day timed events as `kind: "timed"`).
 *
 * `days` must be consecutive-or-not start-of-day dates in display order
 * (weekends may be missing); events are matched to columns by calendar day,
 * never by arithmetic on `days[0]`, so gaps are handled correctly.
 *
 * @example
 * const segments = layoutSegments(weekEvents, weekDays, "spans")
 */
export function layoutSegments<T>(events: readonly CalendarEvent<T>[], days: readonly Date[], include: "spans" | "all"): Segment<T>[] {
  const firstDay = days[0]
  const lastDay = days[days.length - 1]
  if (!firstDay || !lastDay) return [] // nothing to lay out against an empty grid

  const candidates = events.flatMap((event) => toSegment(event, days, firstDay, lastDay, include))
  const spans = candidates.filter((segment) => segment.kind === "span").sort(compareSpans)
  const timed = candidates.filter((segment) => segment.kind === "timed").sort(compareByStartThenName)
  return assignRows([...spans, ...timed])
}

/**
 * Splits `segments` into what fits in `maxRows` and what to report as
 * overflow, for a "+N more" affordance per column.
 *
 * @param columns - Number of day columns (`days.length`), so `overflow` is sized correctly even when no segment reaches the last one.
 * @returns `visible` segments with `row < maxRows`; `overflow[col]` is how many hidden segments cover that column.
 */
export function limitRows<T>(
  segments: readonly Segment<T>[],
  maxRows: number,
  columns: number,
): { visible: Segment<T>[]; overflow: number[] } {
  const visible = segments.filter((segment) => segment.row < maxRows)
  const hidden = segments.filter((segment) => segment.row >= maxRows)

  const overflow = new Array<number>(columns).fill(0)
  for (const segment of hidden) {
    for (let col = segment.startCol; col <= segment.endCol; col++) {
      if (col >= 0 && col < columns) overflow[col] = (overflow[col] ?? 0) + 1
    }
  }

  return { visible, overflow }
}
