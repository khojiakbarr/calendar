import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react"
import { classNames } from "../../core/classNames"
import { addDays, spansWholeDays } from "../../core/date"
import { formatDayMonth, formatTime } from "../../core/format"
import { fill } from "../../core/labels"
import type { TimedBlock } from "../../core/layout"
import type { CalendarInstance } from "../../instance"
import type { CalendarEvent, CalendarLabels } from "../../types"
import { useSlotClass } from "../classesContext"

/** Minutes in an hour — the unit `--cal-hour-height` is expressed per. */
const MINUTES_PER_HOUR = 60

/** Gap between side-by-side chips, so touching events stay visually separate. */
const COLUMN_GAP_PX = 2

/** Shortest a chip may be drawn, so a 5-minute event is still clickable. */
const MIN_CHIP_HEIGHT_PX = 18

/**
 * Inline styles that may also set `--cal-*` custom properties.
 *
 * `CSSProperties` alone rejects them, and the chip colour contract is exactly
 * such a property: the element declares `--cal-event-color` and the stylesheet
 * derives its tint, border and hover state from it.
 */
export type EventStyle = CSSProperties & Record<`--cal-${string}`, string>

/** What every event chip needs, wherever it is drawn. */
export interface EventChipOptions<T> {
  event: CalendarEvent<T>
  labels: CalendarLabels
  locale: string
  onOpen(event: CalendarEvent<T>, anchor: HTMLElement): void
  onHover(event: CalendarEvent<T> | null, anchor: HTMLElement | null): void
  /**
   * Reports whether the pointer session that just ended (or is still active)
   * crossed the drag threshold — a click right after a drag-release must not
   * also open the editor. Only the time grid's chips can be dragged; the
   * all-day row has no drag of its own, so it omits this and every click opens.
   */
  wasDragged?(): boolean
}

/** The accessibility and interaction props shared by timed chips and all-day pills. */
export interface EventChipProps {
  role: "button"
  tabIndex: 0
  "data-event-id": string
  "aria-label": string
  onClick(event: ReactMouseEvent<HTMLElement>): void
  onDoubleClick(event: ReactMouseEvent<HTMLElement>): void
  onKeyDown(event: ReactKeyboardEvent<HTMLElement>): void
  onMouseEnter(event: ReactMouseEvent<HTMLElement>): void
  onMouseLeave(): void
}

/**
 * The props that make a chip behave like an event, shared by the time grid and
 * the all-day row so both open, describe and hover identically.
 *
 * A chip is a `div` with `role="button"` rather than a real `<button>` because
 * it is also a drag handle: a button would swallow the pointer gesture a move
 * or resize needs.
 *
 * Opening is click-driven: a plain click (no drag beforehand) opens the
 * editor. A native double-click fires `click` (detail 1) then `click` (detail
 * 2) then `dblclick` — the first click already opens, so the second click is
 * ignored by its `detail`, and `onDoubleClick` only stops the event reaching
 * the grid's own double-click-to-create handler underneath, rather than
 * opening a second time.
 *
 * @param options - The event, the label bundle, the locale, and the callbacks.
 * @returns Props to spread onto the chip element.
 *
 * @example
 * <div className="cal-event" {...eventChipProps({ event, labels, locale, onOpen, onHover })} />
 */
export function eventChipProps<T>(options: EventChipOptions<T>): EventChipProps {
  const { event, labels, locale, onOpen, onHover, wasDragged } = options
  return {
    role: "button",
    tabIndex: 0,
    "data-event-id": event.id,
    "aria-label": fill(labels.eventDescription, {
      name: event.name || labels.untitled,
      ...describeRange(event, locale),
    }),
    onClick: (mouse) => {
      if (mouse.detail > 1) return // the second click of a double-click; the first already opened
      if (wasDragged?.()) return
      onOpen(event, mouse.currentTarget)
    },
    onDoubleClick: (mouse) => {
      // Stop the grid's own double-click, which would otherwise create an event underneath.
      mouse.stopPropagation()
    },
    onKeyDown: (key) => {
      if (key.key !== "Enter" && key.key !== " ") return
      key.preventDefault() // Space would scroll the grid
      onOpen(event, key.currentTarget)
    },
    onMouseEnter: (mouse) => onHover(event, mouse.currentTarget),
    onMouseLeave: () => onHover(null, null),
  }
}

/**
 * Absolute placement for a block on the time grid.
 *
 * Vertical position is expressed in `calc()` against `--cal-hour-height` rather
 * than in pixels, so changing the token rescales the whole grid — including
 * chips already on screen — without React re-rendering anything.
 *
 * @param options - Minute span, the grid's first minute, and the packing columns.
 * @returns Inline styles for the chip.
 */
export function blockStyle(options: {
  startMinutes: number
  endMinutes: number
  dayStartMinutes: number
  column: number
  columns: number
}): CSSProperties {
  const { startMinutes, endMinutes, dayStartMinutes, column, columns } = options
  const widthPercent = 100 / columns
  return {
    top: `calc(var(--cal-hour-height) * ${(startMinutes - dayStartMinutes) / MINUTES_PER_HOUR})`,
    height: `calc(var(--cal-hour-height) * ${(endMinutes - startMinutes) / MINUTES_PER_HOUR})`,
    minHeight: `${MIN_CHIP_HEIGHT_PX}px`,
    left: `${column * widthPercent}%`,
    width: `calc(${widthPercent}% - ${COLUMN_GAP_PX}px)`,
  }
}

/** What {@link TimedEvent} draws. */
export interface TimedEventProps<T> {
  block: TimedBlock<T>
  instance: CalendarInstance<T>
  labels: CalendarLabels
  /** Minute of day at the top of the grid, so the chip knows where zero is. */
  dayStartMinutes: number
  onOpen(event: CalendarEvent<T>, anchor: HTMLElement): void
  onHover(event: CalendarEvent<T> | null, anchor: HTMLElement | null): void
  /** From `useGridDrag` — whether the gesture that just ended on this grid was a drag. */
  wasDragged(): boolean
}

/**
 * One timed event on the day/week grid: a tinted chip with a colour bar,
 * its start time and its name.
 *
 * The chip carries a resize handle only when the calendar would accept the
 * resize — offering a grip that cannot move is worse than offering none.
 *
 * @param props - The packed block plus the instance it belongs to.
 * @returns The positioned chip.
 */
export function TimedEvent<T>({ block, instance, labels, dayStartMinutes, onOpen, onHover, wasDragged }: TimedEventProps<T>) {
  const { event } = block
  const isReadOnly = event.readOnly === true
  const isPending = instance.pendingIds.has(event.id)
  const canResize = instance.flags.resize && !isReadOnly
  const eventSlotClass = useSlotClass("event")
  const style: EventStyle = {
    ...blockStyle({
      startMinutes: block.startMinutes,
      endMinutes: block.endMinutes,
      dayStartMinutes,
      column: block.column,
      columns: block.columns,
    }),
    "--cal-event-color": instance.colorOf(event),
  }

  return (
    <div
      className={classNames(
        "cal-event",
        "cal-event-timed",
        isPending && "cal-event-pending",
        isReadOnly && "cal-event-readonly",
        eventSlotClass,
      )}
      style={style}
      {...eventChipProps({ event, labels, locale: instance.settings.locale, onOpen, onHover, wasDragged })}
    >
      <span className="cal-event-time">{formatTime(event.start, instance.settings.locale)}</span>
      <span className="cal-event-name">{event.name || labels.untitled}</span>
      {canResize && <span className="cal-event-resize" aria-hidden="true" />}
    </div>
  )
}

/**
 * The start/end words for an event's accessible name.
 *
 * A whole-day event has no useful clock times — its exclusive end is midnight,
 * which would read as "12 AM to 12 AM" — so it is described by its days, the
 * last one inclusive.
 */
function describeRange(event: CalendarEvent<unknown>, locale: string): { start: string; end: string } {
  if (!spansWholeDays(event)) {
    return { start: formatTime(event.start, locale), end: formatTime(event.end, locale) }
  }
  return { start: formatDayMonth(event.start, locale), end: formatDayMonth(addDays(event.end, -1), locale) }
}
