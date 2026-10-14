import { classNames } from "../../core/classNames"
import { eventLookClasses } from "../../core/looks"
import type { Segment } from "../../core/spans"
import type { CalendarInstance } from "../../instance"
import type { CalendarEvent, CalendarLabels } from "../../types"
import { useIsLit } from "../litGroupContext"
import { eventChipProps, type EventStyle } from "./TimedEvent"

/** What one {@link AllDayPill} needs: its segment and the row's shared props. */
export interface AllDayPillProps<T> {
  segment: Segment<T>
  instance: CalendarInstance<T>
  labels: CalendarLabels
  onEventOpen(event: CalendarEvent<T>, anchor: HTMLElement): void
  onEventHover(event: CalendarEvent<T> | null, anchor: HTMLElement | null): void
  eventSlotClass: string | undefined
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
 * One pill of the all-day strip — its own component so it can read whether its record is lit.
 *
 * @example
 * <AllDayPill segment={segment} instance={instance} labels={labels} onEventOpen={open} onEventHover={hover} eventSlotClass={slot} />
 */
export function AllDayPill<T>({ segment, instance, labels, onEventOpen, onEventHover, eventSlotClass }: AllDayPillProps<T>) {
  const isLit = useIsLit(segment.event.groupId)
  return (
    <div
      className={classNames(
        "cal-event",
        "cal-allday-pill",
        segment.continuesBefore && "cal-event-continues-before",
        segment.continuesAfter && "cal-event-continues-after",
        instance.pendingIds.has(segment.event.id) && "cal-event-pending",
        segment.event.readOnly === true && "cal-event-readonly",
        eventLookClasses(segment.event),
        isLit && "cal-event-lit",
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
  )
}
