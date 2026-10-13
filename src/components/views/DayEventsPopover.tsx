import { useId, type CSSProperties, type KeyboardEvent } from "react"
import { classNames } from "../../core/classNames"
import { isSameDay } from "../../core/date"
import { formatDayMonth, formatTime, formatWeekdayDayMonth } from "../../core/format"
import { eventLookClasses } from "../../core/looks"
import type { Segment } from "../../core/spans"
import type { CalendarInstance } from "../../instance"
import type { CalendarEvent, CalendarLabels } from "../../types"
import { useSlotClass } from "../classesContext"
import { Popover, type AnchorRect } from "../Popover"
import { describeSegment } from "./monthSegment"
import "../../styles/daylist.css"

export interface DayEventsPopoverProps<TData = unknown> {
  day: Date
  /** Every segment covering the day, in the cell's order. */
  segments: readonly Segment<TData>[]
  anchor: AnchorRect
  labels: CalendarLabels
  instance: CalendarInstance<TData>
  onClose: () => void
  /** An event picked from the list; the card is closed first. */
  onEventOpen: (event: CalendarEvent<TData>) => void
}

/** A span's first and last day, "Sep 28 – Oct 16", or nothing for one inside a single day. */
function spanDates(event: CalendarEvent<unknown>, locale: string): string | null {
  // `end` is exclusive: a span to midnight ends on the day before.
  const lastDay = new Date(event.end.getTime() - 1)
  if (isSameDay(event.start, lastDay)) return null
  return `${formatDayMonth(event.start, locale)} – ${formatDayMonth(lastDay, locale)}`
}

/**
 * Everything one month day holds, in a card over its cell: the "+N" of a day
 * whose events did not fit opens it. Each event is drawn as in the grid — its
 * colour, its look, a span's bar or a timed event's dot — with its whole name,
 * and a span spread over several days says which. Picking one closes the card
 * and opens the event as a chip would; the date in the title opens the day
 * view, where "+N" used to go.
 *
 * @example
 * <DayEventsPopover day={day} segments={daySegments} anchor={rect} labels={labels} instance={instance} onClose={close} onEventOpen={open} />
 */
export function DayEventsPopover<TData = unknown>({ day, segments, anchor, labels, instance, onClose, onEventOpen }: DayEventsPopoverProps<TData>) {
  const titleId = useId()
  const { locale } = instance.settings
  const eventSlotClass = useSlotClass("event")

  const openDay = (): void => {
    onClose()
    instance.setDate(day)
    instance.setView("day")
  }

  const open = (event: CalendarEvent<TData>): void => {
    onClose()
    onEventOpen(event)
  }

  const handleKeyDown = (keyboardEvent: KeyboardEvent<HTMLButtonElement>): void => {
    // A button answers Enter and Space itself; only the list's own arrows are added.
    if (keyboardEvent.key !== "ArrowDown" && keyboardEvent.key !== "ArrowUp") return
    keyboardEvent.preventDefault()
    const items = Array.from(keyboardEvent.currentTarget.closest(".cal-daylist")?.querySelectorAll<HTMLButtonElement>(".cal-daylist-event") ?? [])
    const index = items.indexOf(keyboardEvent.currentTarget)
    const next = items[index + (keyboardEvent.key === "ArrowDown" ? 1 : -1)]
    next?.focus()
  }

  return (
    <Popover anchor={anchor} onClose={onClose} labelledBy={titleId} className="cal-daylist" width={280}>
      <div className="cal-daylist-header">
        <h3 id={titleId} className="cal-daylist-title">
          <button type="button" className="cal-daylist-date" title={labels.openDay} onClick={openDay}>
            {formatWeekdayDayMonth(day, locale)}
          </button>
        </h3>
        <button type="button" className="cal-icon-btn" aria-label={labels.close} onClick={onClose}>
          <span aria-hidden="true">×</span>
        </button>
      </div>
      {segments.length === 0 ? (
        <p className="cal-daylist-empty">{labels.noEvents}</p>
      ) : (
        <ul className="cal-daylist-items">
          {segments.map((segment) => {
            const { event, kind } = segment
            const dates = kind === "span" ? spanDates(event, locale) : null
            return (
              <li key={event.id}>
                <button
                  type="button"
                  className={classNames(
                    "cal-daylist-event",
                    kind === "span" ? "cal-daylist-span" : "cal-daylist-timed",
                    instance.pendingIds.has(event.id) && "cal-event-pending",
                    eventLookClasses(event),
                    eventSlotClass,
                  )}
                  style={{ "--cal-event-color": instance.colorOf(event) } as CSSProperties}
                  data-event-id={event.id}
                  aria-label={describeSegment(segment, labels, locale)}
                  onClick={() => open(event)}
                  onKeyDown={handleKeyDown}
                >
                  {kind === "timed" && <span className="cal-month-event-dot" aria-hidden="true" />}
                  {kind === "timed" && <span className="cal-daylist-time">{formatTime(event.start, locale)}</span>}
                  <span className="cal-daylist-name">{event.name || labels.untitled}</span>
                  {dates ? <span className="cal-daylist-dates">{dates}</span> : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Popover>
  )
}
