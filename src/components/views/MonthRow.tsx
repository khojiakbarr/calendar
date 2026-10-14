import type { CSSProperties, KeyboardEvent, MouseEvent } from "react"
import { classNames } from "../../core/classNames"
import { isoWeek, overlaps } from "../../core/date"
import { formatDateInput, formatTime } from "../../core/format"
import { eventLookClasses } from "../../core/looks"
import { layoutSegments, limitRows, type Segment } from "../../core/spans"
import type { CalendarInstance } from "../../instance"
import type { CalendarEvent, CalendarLabels } from "../../types"
import { useSlotClass } from "../classesContext"
import { useIsLit } from "../litGroupContext"
import { DayEventsPopover } from "./DayEventsPopover"
import { MonthCell, type CellAnchorRect } from "./MonthCell"
import { MonthMore } from "./MonthMore"
import { describeSegment, segmentsOfColumn } from "./monthSegment"
import type { UseMonthDragResult } from "./useMonthDrag"
import type { OpenDay } from "./useOpenDay"

/** One week row: the days it covers and where it falls in the 6-row grid. */
export interface MonthRowProps<TData = unknown> {
  instance: CalendarInstance<TData>
  labels: CalendarLabels
  days: Date[]
  columns: number
  maxRows: number
  /** The rows shown in a week that overflows, the dots' line under them. */
  rowsBesideMore: number
  /** The ≤640px month: fewer overflow dots fit a cell. */
  compact: boolean
  dropDayKey: string | null
  drag: UseMonthDragResult<TData>
  onEventOpen: (event: CalendarEvent<TData>, anchor: HTMLElement) => void
  onEventHover: (event: CalendarEvent<TData> | null, anchor: HTMLElement | null) => void
  onCreateRequest: (day: Date, anchor: CellAnchorRect) => void
  /** The month's open day card, if any — drawn by the row that holds its day. */
  openDay: OpenDay | null
  onDayOpen: (dayKey: string, trigger: HTMLElement) => void
  onDayClose: () => void
}

/** How many event rows a month cell holds: all of them, or as many as leave room for the overflow dots. */
export interface MonthRowLimits {
  maxRows: number
  rowsBesideMore: number
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
    if (mouseEvent.detail > 1) return // the second click of a double-click; the first already opened
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
      aria-label={describeSegment(segment, labels, locale)}
      onClick={openFromPointer}
      // The first click already opened; a double-click must not open again.
      onDoubleClick={(mouseEvent) => mouseEvent.stopPropagation()}
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

/**
 * Renders one week: the ISO week-number cell, the day-cell backgrounds, and
 * an overlay grid stacking that week's event segments — spans first, then
 * single-day timed lines — with the overflow dots of each day past what fits
 * ({@link MonthMore}, on a line kept for them) and, when one is opened, that day's card
 * ({@link DayEventsPopover}).
 */
export function MonthRow<TData = unknown>({
  instance,
  labels,
  days,
  columns,
  maxRows,
  rowsBesideMore,
  compact,
  dropDayKey,
  drag,
  onEventOpen,
  onEventHover,
  onCreateRequest,
  openDay,
  onDayOpen,
  onDayClose,
}: MonthRowProps<TData>) {
  const firstDay = days[0]
  const lastDay = days[days.length - 1]
  if (!firstDay || !lastDay) return null // a row is never built with an empty days array; guards noUncheckedIndexedAccess

  const rowRange = { start: firstDay, end: new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + 1) }
  const rowEvents = instance.events.filter((event) => overlaps({ start: event.start, end: event.end }, rowRange))
  const segments = layoutSegments(rowEvents, days, "all")
  const rowsShown = segments.some((segment) => segment.row >= maxRows) ? rowsBesideMore : maxRows
  const { visible, overflow } = limitRows(segments, rowsShown, columns)
  const gridColumns = { gridTemplateColumns: `repeat(${columns}, 1fr)` }
  // Read live from this row's segments, so an event changed while the card is open is drawn as it is now.
  const openCol = openDay ? days.findIndex((day) => formatDateInput(day) === openDay.dayKey) : -1

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
          {overflow.map((count, col) => {
            if (count === 0) return null
            const dayKey = formatDateInput(days[col] ?? firstDay)
            const hidden = segmentsOfColumn(segments, col).filter((segment) => segment.row >= rowsShown)
            return (
              <MonthMore
                key={dayKey}
                hidden={hidden}
                col={col}
                row={rowsShown}
                isOpen={openDay?.dayKey === dayKey}
                compact={compact}
                labels={labels}
                instance={instance}
                onOpen={(trigger) => onDayOpen(dayKey, trigger)}
              />
            )
          })}
        </div>
      </div>
      {openCol >= 0 && openDay ? (
        <DayEventsPopover
          day={days[openCol] ?? firstDay}
          segments={segmentsOfColumn(segments, openCol)}
          anchor={openDay.anchor}
          labels={labels}
          instance={instance}
          onClose={onDayClose}
          onEventOpen={(event) => onEventOpen(event, openDay.trigger)}
        />
      ) : null}
    </div>
  )
}
