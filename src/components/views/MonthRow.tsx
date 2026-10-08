import type { CSSProperties, KeyboardEvent, MouseEvent } from "react"
import { classNames } from "../../core/classNames"
import { isoWeek, overlaps } from "../../core/date"
import { formatDateInput, formatDayMonth, formatTime } from "../../core/format"
import { fill } from "../../core/labels"
import { eventLookClasses } from "../../core/looks"
import { layoutSegments, limitRows, type Segment } from "../../core/spans"
import type { CalendarInstance } from "../../instance"
import type { CalendarEvent, CalendarLabels } from "../../types"
import { useSlotClass } from "../classesContext"
import { useIsLit } from "../litGroupContext"
import { MonthCell, type CellAnchorRect } from "./MonthCell"
import type { UseMonthDragResult } from "./useMonthDrag"

/** One week row: the days it covers and where it falls in the 6-row grid. */
export interface MonthRowProps<TData = unknown> {
  instance: CalendarInstance<TData>
  labels: CalendarLabels
  days: Date[]
  columns: number
  maxRows: number
  dropDayKey: string | null
  drag: UseMonthDragResult<TData>
  onEventOpen: (event: CalendarEvent<TData>, anchor: HTMLElement) => void
  onEventHover: (event: CalendarEvent<TData> | null, anchor: HTMLElement | null) => void
  onCreateRequest: (day: Date, anchor: CellAnchorRect) => void
}

/** aria-label for a chip: the event name plus its start/end, phrased as a time for a timed event, a date for a span. */
function describeEvent<TData>(segment: Segment<TData>, labels: CalendarLabels, locale: string): string {
  const { event, kind } = segment
  const start = kind === "timed" ? formatTime(event.start, locale) : formatDayMonth(event.start, locale)
  const end = kind === "timed" ? formatTime(event.end, locale) : formatDayMonth(event.end, locale)
  return fill(labels.eventDescription, { name: event.name || labels.untitled, start, end })
}

/** One event chip: a solid pill for a span, a coloured dot + time + name line for a single-day timed event. */
function EventChip<TData>({
  segment,
  instance,
  labels,
  drag,
  onEventOpen,
  onEventHover,
}: {
  segment: Segment<TData>
  instance: CalendarInstance<TData>
  labels: CalendarLabels
  drag: UseMonthDragResult<TData>
  onEventOpen: (event: CalendarEvent<TData>, anchor: HTMLElement) => void
  onEventHover: (event: CalendarEvent<TData> | null, anchor: HTMLElement | null) => void
}) {
  const { event, kind, startCol, endCol, row, continuesBefore, continuesAfter } = segment
  const { locale } = instance.settings
  const dragHandlers = drag.getChipHandlers(event)
  const eventSlotClass = useSlotClass("event")
  const isLit = useIsLit(event.groupId)

  const openFromPointer = (mouseEvent: MouseEvent<HTMLDivElement>): void => {
    if (drag.wasDragged()) return
    onEventOpen(event, mouseEvent.currentTarget)
  }

  const handleKeyDown = (keyboardEvent: KeyboardEvent<HTMLDivElement>): void => {
    if (keyboardEvent.key !== "Enter" && keyboardEvent.key !== " ") return
    keyboardEvent.preventDefault()
    onEventOpen(event, keyboardEvent.currentTarget)
  }

  return (
    <div
      className={classNames(
        "cal-month-event",
        kind === "span" ? "cal-month-event-span" : "cal-month-event-timed",
        continuesBefore && "cal-continues-before",
        continuesAfter && "cal-continues-after",
        instance.pendingIds.has(event.id) && "cal-event-pending",
        eventLookClasses(event),
        isLit && "cal-event-lit",
        eventSlotClass,
      )}
      style={{ gridColumn: `${startCol + 1} / ${endCol + 2}`, gridRow: row + 1, "--cal-event-color": instance.colorOf(event) } as CSSProperties}
      role="button"
      data-event-id={event.id}
      data-group={event.groupId}
      tabIndex={0}
      aria-label={describeEvent(segment, labels, locale)}
      onClick={openFromPointer}
      onDoubleClick={openFromPointer}
      onKeyDown={handleKeyDown}
      onMouseEnter={(mouseEvent) => onEventHover(event, mouseEvent.currentTarget)}
      onMouseLeave={() => onEventHover(null, null)}
      {...dragHandlers}
    >
      {kind === "timed" && <span className="cal-month-event-dot" />}
      {kind === "timed" && <span className="cal-month-event-time">{formatTime(event.start, locale)}</span>}
      <span className="cal-month-event-name">{event.name || labels.untitled}</span>
    </div>
  )
}

/** The "+N more" affordance for one day's hidden overflow, placed just under the last visible row. */
function MoreButton<TData>({
  day,
  count,
  col,
  row,
  labels,
  instance,
}: {
  day: Date
  count: number
  col: number
  row: number
  labels: CalendarLabels
  instance: CalendarInstance<TData>
}) {
  const handleClick = (): void => {
    instance.setDate(day)
    instance.setView("day")
  }
  return (
    <button type="button" className="cal-month-more" style={{ gridColumn: col + 1, gridRow: row + 1 }} onClick={handleClick}>
      {fill(labels.more, { n: count })}
    </button>
  )
}

/**
 * Renders one week: the ISO week-number cell, the day-cell backgrounds, and
 * an overlay grid stacking that week's event segments — spans first, then
 * single-day timed lines — with a "+N more" button per day that overflows
 * `maxRows`.
 */
export function MonthRow<TData = unknown>({
  instance,
  labels,
  days,
  columns,
  maxRows,
  dropDayKey,
  drag,
  onEventOpen,
  onEventHover,
  onCreateRequest,
}: MonthRowProps<TData>) {
  const firstDay = days[0]
  const lastDay = days[days.length - 1]
  if (!firstDay || !lastDay) return null // a row is never built with an empty days array; guards noUncheckedIndexedAccess

  const rowRange = { start: firstDay, end: new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + 1) }
  const rowEvents = instance.events.filter((event) => overlaps({ start: event.start, end: event.end }, rowRange))
  const segments = layoutSegments(rowEvents, days, "all")
  const { visible, overflow } = limitRows(segments, maxRows, columns)
  const gridColumns = { gridTemplateColumns: `repeat(${columns}, 1fr)` }

  return (
    <div className="cal-month-row" role="row">
      <div className="cal-month-weeknum">{isoWeek(firstDay)}</div>
      <div className="cal-month-days" style={gridColumns}>
        {days.map((day) => (
          <MonthCell
            key={formatDateInput(day)}
            day={day}
            instance={instance}
            isDropTarget={dropDayKey === formatDateInput(day)}
            onDoubleClickEmpty={onCreateRequest}
          />
        ))}
        <div className="cal-month-segments" style={gridColumns}>
          {visible.map((segment) => (
            <EventChip key={segment.event.id} segment={segment} instance={instance} labels={labels} drag={drag} onEventOpen={onEventOpen} onEventHover={onEventHover} />
          ))}
          {overflow.map((count, col) =>
            count > 0 ? <MoreButton key={col} day={days[col] ?? firstDay} count={count} col={col} row={maxRows} labels={labels} instance={instance} /> : null,
          )}
        </div>
      </div>
    </div>
  )
}
