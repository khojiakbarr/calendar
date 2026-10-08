import { useEffect, useRef } from "react"
import type { CalendarInstance } from "../../instance"
import type { CalendarEvent, CalendarLabels } from "../../types"
import { classNames } from "../../core/classNames"
import { startOfDay } from "../../core/date"
import { useSlotClass } from "../classesContext"
import { AgendaDayRow } from "./AgendaDayRow"
import { groupEventsByDay } from "./agendaFormat"
import "../../styles/agenda.css"

export interface AgendaViewProps<TData = unknown> {
  instance: CalendarInstance<TData>
  labels: CalendarLabels
  onEventOpen: (event: CalendarEvent<TData>, anchor: HTMLElement) => void
}

/**
 * The month-long list view: one block per day that has events, each event a
 * clickable row.
 *
 * Grouping happens against `instance.days` — the same list every other view
 * draws from — rather than deriving days from the events themselves, so a
 * day with nothing scheduled is simply absent, consistently with the rest
 * of the calendar.
 */
export function AgendaView<TData = unknown>({ instance, labels, onEventOpen }: AgendaViewProps<TData>) {
  const groups = groupEventsByDay(instance.days, instance.events, instance.settings.agendaSpans)
  // Read before the early return below: hooks must run unconditionally on every render.
  const viewSlotClass = useSlotClass("view")
  const agendaSlotClass = useSlotClass("agenda")
  const listRef = useRef<HTMLDivElement>(null)
  // The month shown starts on its 1st, but whoever opens it this month wants today: bring the first
  // day from today on to the top, once per month opened (not on every render, which would fight a scroll).
  const firstShown = instance.days[0]?.getTime()
  const today = startOfDay(instance.settings.now()).getTime()
  const hasGroups = groups.length > 0
  useEffect(() => {
    const list = listRef.current
    if (!list || !hasGroups) return
    const days = Array.from(list.querySelectorAll<HTMLElement>("[data-agenda-day]"))
    const target = days.find((element) => Number(element.dataset.agendaDay) >= today)
    if (target && target !== days[0]) list.scrollTop = target.offsetTop - list.offsetTop
  }, [firstShown, today, hasGroups])

  if (groups.length === 0) {
    return <p className="cal-empty">{labels.noEvents}</p>
  }

  return (
    <div ref={listRef} className={classNames("cal-agenda", viewSlotClass, agendaSlotClass)}>
      {groups.map((group) => (
        <AgendaDayRow key={group.day.toISOString()} group={group} instance={instance} labels={labels} onEventOpen={onEventOpen} />
      ))}
    </div>
  )
}
