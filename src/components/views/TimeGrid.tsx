import { useEffect, useMemo, useRef } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"
import { classNames } from "../../core/classNames"
import { isSameDay, isWeekend, spansWholeDays, withMinutesOfDay } from "../../core/date"
import { formatTime } from "../../core/format"
import { fill } from "../../core/labels"
import { layoutDay, limitColumns, type ColumnOverflow } from "../../core/layout"
import type { CalendarInstance } from "../../instance"
import type { CalendarEvent, CalendarLabels, EventDraft } from "../../types"
import { useSlotClass } from "../classesContext"
import { AllDayRow } from "./AllDayRow"
import type { AnchorRect } from "./anchor"
import { DayHeader } from "./DayHeader"
import { NowLine } from "./NowLine"
import { blockStyle, TimedEvent, type EventStyle } from "./TimedEvent"
import { useGridDrag, type GridGhost } from "./useGridDrag"
import { measureGrid, minuteAt, slotRect } from "./useGridPointer"

/** Where the grid parks its scroll: past the empty night, before the working day. */
const PREFERRED_SCROLL_HOUR = 7
/** Half an hour label plus a little air, in pixels. */
const HOUR_LABEL_CLEARANCE_PX = 12

/** What {@link TimeGrid} draws. */
export interface TimeGridProps<T> {
  instance: CalendarInstance<T>
  labels: CalendarLabels
  onEventOpen(event: CalendarEvent<T>, anchor: HTMLElement): void
  onCreateRequest(draft: EventDraft<T>, anchor: AnchorRect): void
  onEventHover(event: CalendarEvent<T> | null, anchor: HTMLElement | null): void
}

/** The dashed block a drag draws before anything is committed. */
function ghostStyle<T>(ghost: GridGhost<T>, dayStartMinutes: number, color: string): EventStyle {
  return {
    ...blockStyle({ startMinutes: ghost.startMinutes, endMinutes: ghost.endMinutes, dayStartMinutes, column: 0, columns: 1 }),
    "--cal-event-color": color,
  }
}

/**
 * The day and week views' shared grid: sticky day headers, an all-day strip,
 * and a scrolling hour grid carrying the timed events.
 *
 * One component serves both because a day *is* a one-column week — `instance.days`
 * already holds 1 or 5/7 dates, so nothing here needs to know which view it is.
 *
 * @param props - The instance, the label bundle, and the callbacks that open
 *   the editor, the tooltip, and the create flow.
 * @returns The time grid.
 *
 * @example
 * <TimeGrid instance={instance} labels={labels} onEventOpen={openEditor} … />
 */
export function TimeGrid<T>({ instance, labels, onEventOpen, onCreateRequest, onEventHover }: TimeGridProps<T>) {
  const { days, settings } = instance
  const hourCount = settings.dayEndHour - settings.dayStartHour
  const dayStartMinutes = settings.dayStartHour * 60
  const scrollRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const gridTemplateColumns = `var(--cal-gutter-width) repeat(${days.length}, minmax(0, 1fr))`
  const today = settings.now()
  const referenceDay = days[0] ?? today
  const hourOffsets = Array.from({ length: Math.max(0, hourCount) }, (_, index) => index)

  // All-day and multi-day events belong to the strip above; letting them into
  // the packer would also squeeze every timed event they overlap into a column.
  const timedEvents = useMemo(() => instance.events.filter((event) => !spansWholeDays(event)), [instance.events])
  const defaultResourceId = instance.resources.find((resource) => !instance.hiddenResourceIds.includes(resource.id))?.id

  /** A new event in `column` covering the given minutes, ready for the editor. */
  const buildDraft = (column: number, startMinutes: number, endMinutes: number): EventDraft<T> => {
    const day = days[column] ?? referenceDay
    return {
      // Empty rather than "New event": the editor's Name field should start blank,
      // and `labels.untitled` already stands in wherever an unnamed event is drawn.
      name: "",
      start: withMinutesOfDay(day, startMinutes),
      end: withMinutesOfDay(day, endMinutes),
      allDay: false,
      ...(defaultResourceId === undefined ? {} : { resourceId: defaultResourceId }),
    }
  }

  const { ghost, dragging, handlers, wasDragged } = useGridDrag<T>({ instance, bodyRef, buildDraft, onCreateRequest })
  // Both slots: this element is the "view" root (like every other view's root)
  // and, more specifically, the "timeGrid" the day/week views share.
  const viewSlotClass = useSlotClass("view")
  const timeGridSlotClass = useSlotClass("timeGrid")

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller || hourCount <= 0) return
    const targetHour = Math.max(PREFERRED_SCROLL_HOUR, settings.dayStartHour)
    // Pixels per hour is derived from the rendered height rather than read from
    // `--cal-hour-height`, so a theme that rescales the token still lands on 7:00.
    // Stop a little short of the hour line so its label, which is centred on
    // the line, is not cut in half at the top of the viewport.
    const hourTop = (scroller.scrollHeight / hourCount) * (targetHour - settings.dayStartHour)
    scroller.scrollTop = Math.max(0, hourTop - HOUR_LABEL_CLEARANCE_PX)
  }, [instance.view, settings.dayStartHour, hourCount])

  const handleDaySelect = (day: Date): void => {
    instance.setDate(day)
    instance.setView("day")
  }

  // A week's columns are narrow: a few side by side, then «+N». The day view has room for twice as many.
  const isMultiDay = days.length > 1
  const maxColumns = isMultiDay ? settings.maxEventColumns : settings.maxEventColumns * 2
  // «+N» opens a roomier view of that day: the day view from a week, the agenda from a day.
  const handleOverflow = (day: Date): void => {
    instance.setDate(day)
    instance.setView(isMultiDay ? "day" : "agenda")
  }

  const handleColumnDoubleClick = (mouse: ReactMouseEvent<HTMLDivElement>, column: number): void => {
    const body = bodyRef.current
    if (!instance.flags.create || !body) return
    const metrics = measureGrid(body, mouse.currentTarget, column, days.length, settings)
    // Keep the default-length event inside the drawn day when there is room for it.
    const latestStart = Math.max(metrics.startMinute, metrics.endMinute - settings.defaultEventMinutes)
    const startMinutes = Math.min(minuteAt(metrics, mouse.clientY), latestStart)
    const endMinutes = startMinutes + settings.defaultEventMinutes
    onCreateRequest(buildDraft(column, startMinutes, endMinutes), slotRect(metrics, column, startMinutes, endMinutes))
  }

  return (
    <div className={classNames("cal-timegrid", viewSlotClass, timeGridSlotClass)}>
      <div className="cal-timegrid-header" style={{ gridTemplateColumns }}>
        <div className="cal-timegrid-header-gutter" />
        {days.map((day) => (
          <DayHeader
            key={day.getTime()}
            day={day}
            locale={settings.locale}
            isToday={isSameDay(day, today)}
            // Only a multi-day view can drill in; in day view the number is already the day shown.
            onSelect={days.length > 1 ? handleDaySelect : undefined}
          />
        ))}
      </div>

      <AllDayRow
        instance={instance}
        labels={labels}
        gridTemplateColumns={gridTemplateColumns}
        onEventOpen={onEventOpen}
        onEventHover={onEventHover}
      />

      <div className="cal-timegrid-scroll" ref={scrollRef}>
        <div
          ref={bodyRef}
          className={classNames("cal-timegrid-body", dragging && "cal-dragging")}
          style={{ gridTemplateColumns, height: `calc(var(--cal-hour-height) * ${hourCount})` }}
          {...handlers}
        >
          <div className="cal-timegrid-gutter">
            {/* The first label would sit on the grid's top edge with nothing above it. */}
            {hourOffsets.slice(1).map((offset) => (
              <span key={offset} className="cal-timegrid-hour-label" style={{ top: `calc(var(--cal-hour-height) * ${offset})` }}>
                {formatTime(withMinutesOfDay(referenceDay, dayStartMinutes + offset * 60), settings.locale)}
              </span>
            ))}
          </div>

          {days.map((day, column) => {
            const isToday = isSameDay(day, today)
            return (
              <div
                key={day.getTime()}
                className={classNames("cal-timegrid-col", isWeekend(day) && "cal-weekend", isToday && "cal-today")}
                data-column={column}
                onDoubleClick={(mouse) => handleColumnDoubleClick(mouse, column)}
              >
                <div className="cal-timegrid-lines" aria-hidden="true">
                  {hourOffsets.map((offset) => (
                    <div key={offset} className="cal-timegrid-hour" />
                  ))}
                </div>

                <DayBlocks
                  day={day}
                  events={timedEvents}
                  maxColumns={maxColumns}
                  instance={instance}
                  labels={labels}
                  dayStartMinutes={dayStartMinutes}
                  onOpen={onEventOpen}
                  onHover={onEventHover}
                  wasDragged={wasDragged}
                  onOverflow={handleOverflow}
                />

                {isToday && <NowLine dayStartHour={settings.dayStartHour} dayEndHour={settings.dayEndHour} now={settings.now} />}

                {ghost && ghost.column === column && (
                  <div
                    className="cal-event cal-event-ghost"
                    aria-hidden="true"
                    style={ghostStyle(ghost, dayStartMinutes, ghost.event ? instance.colorOf(ghost.event) : "var(--cal-accent)")}
                  >
                    <span className="cal-event-time">{formatTime(withMinutesOfDay(day, ghost.startMinutes), settings.locale)}</span>
                    {ghost.event && <span className="cal-event-name">{ghost.event.name || labels.untitled}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** What {@link DayBlocks} draws: one day's timed events, packed and capped. */
interface DayBlocksProps<T> {
  day: Date
  events: CalendarEvent<T>[]
  maxColumns: number
  instance: CalendarInstance<T>
  labels: CalendarLabels
  dayStartMinutes: number
  onOpen(event: CalendarEvent<T>, anchor: HTMLElement): void
  onHover(event: CalendarEvent<T> | null, anchor: HTMLElement | null): void
  wasDragged(): boolean
  onOverflow(day: Date): void
}

/**
 * One day's column of timed events: packed side by side, a crowded cluster
 * capped at `maxColumns` with a «+N» slot standing for the rest
 * (`limitColumns`), so six meetings at one hour stay readable.
 */
function DayBlocks<T>({ day, events, maxColumns, instance, labels, dayStartMinutes, onOpen, onHover, wasDragged, onOverflow }: DayBlocksProps<T>) {
  const { visible, overflow } = limitColumns(layoutDay(events, day), maxColumns)
  return (
    <>
      {visible.map((block) => (
        <TimedEvent
          key={block.event.id}
          block={block}
          instance={instance}
          labels={labels}
          dayStartMinutes={dayStartMinutes}
          onOpen={onOpen}
          onHover={onHover}
          wasDragged={wasDragged}
        />
      ))}
      {overflow.map((slot) => (
        <OverflowSlot key={`${slot.startMinutes}-${slot.column}`} slot={slot} labels={labels} dayStartMinutes={dayStartMinutes} onOpen={() => onOverflow(day)} />
      ))}
    </>
  )
}

/** The «+N» standing for a cluster's hidden events, in its last column, as tall as they are. */
function OverflowSlot<T>({ slot, labels, dayStartMinutes, onOpen }: { slot: ColumnOverflow<T>; labels: CalendarLabels; dayStartMinutes: number; onOpen(): void }) {
  return (
    <button
      type="button"
      className="cal-timegrid-more"
      style={blockStyle({ startMinutes: slot.startMinutes, endMinutes: slot.endMinutes, dayStartMinutes, column: slot.column, columns: slot.columns })}
      title={slot.events.map((event) => event.name || labels.untitled).join("\n")}
      onClick={onOpen}
      onDoubleClick={(mouse) => mouse.stopPropagation()}
    >
      {fill(labels.more, { n: slot.count })}
    </button>
  )
}
