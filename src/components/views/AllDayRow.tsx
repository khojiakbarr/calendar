import { classNames } from "../../core/classNames"
import { fill } from "../../core/labels"
import { eventLookClasses } from "../../core/looks"
import { layoutSegments, limitRows, type Segment } from "../../core/spans"
import type { CalendarInstance } from "../../instance"
import type { CalendarEvent, CalendarLabels } from "../../types"
import { useSlotClass } from "../classesContext"
import { eventChipProps, type EventStyle } from "./TimedEvent"

/** How many bars stack before the rest collapse into "+N more". */
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

/** One all-day pill, placed by CSS grid across the days it covers. */
function pillStyle<T>(segment: Segment<T>, color: string): EventStyle {
  return {
    // +1 because CSS grid lines are 1-based; +2 on the end because `endCol` is
    // inclusive and a grid end line sits after the track it closes.
    gridColumn: `${segment.startCol + 1} / ${segment.endCol + 2}`,
    gridRow: segment.row + 1,
    "--cal-event-color": color,
  }
}

/**
 * The strip above the time grid holding all-day and multi-day events.
 *
 * These cannot live on the time grid: they have no meaningful start minute and
 * a multi-day one would have to be cut into disconnected pieces. Laid out as
 * first-fit rows so a bar crossing a week stays one continuous pill, with the
 * overflow past three rows offered as a "+N more" drill-in per day.
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

  const handleDrillIn = (day: Date): void => {
    instance.setDate(day)
    instance.setView("day")
  }

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
          <div
            key={segment.event.id}
            className={classNames(
              "cal-event",
              "cal-allday-pill",
              segment.continuesBefore && "cal-event-continues-before",
              segment.continuesAfter && "cal-event-continues-after",
              instance.pendingIds.has(segment.event.id) && "cal-event-pending",
              segment.event.readOnly === true && "cal-event-readonly",
              eventLookClasses(segment.event),
              eventSlotClass,
            )}
            style={pillStyle(segment, instance.colorOf(segment.event))}
            data-group={segment.event.groupId}
            {...eventChipProps({
              event: segment.event,
              labels,
              locale: instance.settings.locale,
              onOpen: onEventOpen,
              onHover: onEventHover,
            })}
          >
            {segment.event.name || labels.untitled}
          </div>
        ))}
        {overflow.map((count, column) => {
          const day = days[column]
          if (count === 0 || !day) return null
          return (
            <button
              key={day.getTime()}
              type="button"
              className="cal-allday-more"
              style={{ gridColumn: column + 1, gridRow: rowCount }}
              onClick={() => handleDrillIn(day)}
            >
              {fill(labels.more, { n: count })}
            </button>
          )
        })}
      </div>
    </div>
  )
}
