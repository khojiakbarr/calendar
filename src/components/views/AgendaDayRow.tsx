import type { CSSProperties } from "react"
import type { CalendarInstance } from "../../instance"
import type { CalendarEvent, CalendarLabels } from "../../types"
import { isSameDay } from "../../core/date"
import { formatMonth, formatTime, formatTimeRange, formatWeekday } from "../../core/format"
import { fill } from "../../core/labels"
import { classNames } from "../../core/classNames"
import { eventLookClasses } from "../../core/looks"
import { useSlotClass } from "../classesContext"
import { useIsLit } from "../litGroupContext"
import type { AgendaDayGroup } from "./agendaFormat"
import { spanLabel } from "./agendaFormat"

interface AgendaDayRowProps<TData> {
  group: AgendaDayGroup<TData>
  instance: CalendarInstance<TData>
  labels: CalendarLabels
  onEventOpen: (event: CalendarEvent<TData>, anchor: HTMLElement) => void
}

/** One day's block in the agenda: its date header, then every event that touches it, spans first. */
export function AgendaDayRow<TData>({ group, instance, labels, onEventOpen }: AgendaDayRowProps<TData>) {
  const { locale } = instance.settings
  const isToday = isSameDay(group.day, instance.settings.now())

  return (
    <div className={classNames("cal-agenda-day", isToday && "cal-agenda-today")} data-agenda-day={group.day.getTime()}>
      <div className="cal-agenda-day-header">
        <span className="cal-agenda-day-number">{group.day.getDate()}</span>
        <span className="cal-agenda-day-weekday">{formatWeekday(group.day, locale, "long")}</span>
        <span className="cal-agenda-day-month">
          {formatMonth(group.day, locale, "short")} {group.day.getFullYear()}
        </span>
      </div>
      <div className="cal-agenda-day-rows">
        {group.spans.map((event) => (
          <AgendaEventRow key={event.id} event={event} instance={instance} labels={labels} onEventOpen={onEventOpen} kind="span" />
        ))}
        {group.timed.map((event) => (
          <AgendaEventRow key={event.id} event={event} instance={instance} labels={labels} onEventOpen={onEventOpen} kind="timed" />
        ))}
      </div>
    </div>
  )
}

interface AgendaEventRowProps<TData> {
  event: CalendarEvent<TData>
  instance: CalendarInstance<TData>
  labels: CalendarLabels
  onEventOpen: (event: CalendarEvent<TData>, anchor: HTMLElement) => void
  kind: "span" | "timed"
}

/** A single clickable row for one event: a tinted pill for a whole-day span, a dotted row for a timed one. */
function AgendaEventRow<TData>({ event, instance, labels, onEventOpen, kind }: AgendaEventRowProps<TData>) {
  const { locale } = instance.settings
  const name = event.name || labels.untitled
  const description = fill(labels.eventDescription, {
    name,
    start: formatTime(event.start, locale),
    end: formatTime(event.end, locale),
  })
  const eventSlotClass = useSlotClass("event")
  const isLit = useIsLit(event.groupId)

  return (
    <button
      type="button"
      className={classNames("cal-agenda-row", kind === "span" ? "cal-agenda-span" : "cal-agenda-timed", eventLookClasses(event), isLit && "cal-event-lit", eventSlotClass)}
      style={eventColorStyle(instance.colorOf(event))}
      data-event-id={event.id}
      data-group={event.groupId}
      aria-label={description}
      onClick={(clickEvent) => {
        if (clickEvent.detail > 1) return // the second click of a double-click; the first already opened
        onEventOpen(event, clickEvent.currentTarget)
      }}
    >
      {kind === "span" ? (
        <span className="cal-agenda-span-label">
          {spanLabel(event, labels, locale)} • {name}
        </span>
      ) : (
        <>
          <span className="cal-agenda-time">{formatTimeRange(event.start, event.end, locale)}</span>
          <span className="cal-agenda-dot" aria-hidden="true" />
          <span className="cal-agenda-name">{name}</span>
        </>
      )}
    </button>
  )
}

/**
 * Exposes `color` as the `--cal-event-color` custom property per the event
 * chip colour contract; React's `CSSProperties` has no index signature for
 * custom properties, so the cast is unavoidable rather than a shortcut.
 */
function eventColorStyle(color: string): CSSProperties {
  return { "--cal-event-color": color } as CSSProperties
}
