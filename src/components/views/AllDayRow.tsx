import { classNames } from "../../core/classNames"
import { formatDateInput } from "../../core/format"
import { layoutSegments, limitRows } from "../../core/spans"
import type { CalendarInstance } from "../../instance"
import type { CalendarEvent, CalendarLabels } from "../../types"
import { useSlotClass } from "../classesContext"
import { COMPACT_QUERY, useMediaQuery } from "../useMediaQuery"
import { AllDayPill } from "./AllDayPill"
import { DayEventsPopover } from "./DayEventsPopover"
import { MonthMore } from "./MonthMore"
import { segmentsOfColumn } from "./monthSegment"
import { useOpenDay } from "./useOpenDay"

/** How many bars stack before the rest collapse into a day's overflow dots. */
const MAX_ALLDAY_ROWS = 3

/** What {@link AllDayRow} draws. */
export interface AllDayRowProps<T> {
  instance: CalendarInstance<T>
  labels: CalendarLabels
  /** Grid template shared with the header and body so the columns line up. */
  gridTemplateColumns: string
  onEventOpen(event: CalendarEvent<T>, anchor: HTMLElement): void
  onEventHover(event: CalendarEvent<T> | null, anchor: HTMLElement | null): void
}

/**
 * The strip above the time grid holding all-day and multi-day events.
 *
 * These cannot live on the time grid: they have no meaningful start minute and
 * a multi-day one would have to be cut into disconnected pieces. Laid out as
 * first-fit rows so a bar crossing a week stays one continuous pill. What does
 * not fit in three rows is a day's overflow as the month draws it — a dot in
 * each hidden event's colour, then "+N" ({@link MonthMore}) — and opens that
 * day's card ({@link DayEventsPopover}) with every all-day event of the day.
 *
 * @param props - The instance, labels, the shared grid template, and the event callbacks.
 * @returns The all-day row.
 *
 * @example
 * <AllDayRow instance={instance} labels={labels} gridTemplateColumns={template} … />
 */
export function AllDayRow<T>({ instance, labels, gridTemplateColumns, onEventOpen, onEventHover }: AllDayRowProps<T>) {
  const { days } = instance
  const segments = layoutSegments(instance.events, days, "spans")
  const { visible, overflow } = limitRows(segments, MAX_ALLDAY_ROWS, days.length)
  const hasOverflow = overflow.some((count) => count > 0)
  const usedRows = visible.reduce((rows, segment) => Math.max(rows, segment.row + 1), 0)
  const rowCount = Math.max(1, usedRows + (hasOverflow ? 1 : 0))
  // A week's column on a phone holds two dots; the day view's one column has room for four.
  const isCompact = useMediaQuery(COMPACT_QUERY) && days.length > 1
  const { openDay, openDayCard, closeDayCard } = useOpenDay(days)
  const openCol = openDay ? days.findIndex((day) => formatDateInput(day) === openDay.dayKey) : -1
  const openDate = days[openCol]

  const rowSlotClass = useSlotClass("allDayRow")
  const eventSlotClass = useSlotClass("event")

  return (
    <div className={classNames("cal-allday-row", rowSlotClass)} style={{ gridTemplateColumns }}>
      <div className="cal-allday-gutter">{labels.allDay}</div>
      <div
        className="cal-allday-cols"
        style={{
          gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rowCount}, var(--cal-allday-row-height))`,
        }}
      >
        {visible.map((segment) => (
          <AllDayPill
            key={segment.event.id}
            segment={segment}
            instance={instance}
            labels={labels}
            onEventOpen={onEventOpen}
            onEventHover={onEventHover}
            eventSlotClass={eventSlotClass}
          />
        ))}
        {overflow.map((count, column) => {
          const day = days[column]
          if (count === 0 || !day) return null
          const dayKey = formatDateInput(day)
          return (
            <MonthMore
              key={dayKey}
              className="cal-allday-more"
              hidden={segmentsOfColumn(segments, column).filter((segment) => segment.row >= MAX_ALLDAY_ROWS)}
              col={column}
              row={rowCount - 1}
              isOpen={openDay?.dayKey === dayKey}
              compact={isCompact}
              labels={labels}
              instance={instance}
              onOpen={(trigger) => openDayCard(dayKey, trigger)}
            />
          )
        })}
      </div>
      {openDay && openDate ? (
        <DayEventsPopover
          day={openDate}
          segments={segmentsOfColumn(segments, openCol)}
          anchor={openDay.anchor}
          labels={labels}
          instance={instance}
          onClose={closeDayCard}
          onEventOpen={(event) => onEventOpen(event, openDay.trigger)}
        />
      ) : null}
    </div>
  )
}
