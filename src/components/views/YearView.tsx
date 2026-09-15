import { useMemo } from "react"
import { classNames } from "../../core/classNames"
import { eachDay } from "../../core/date"
import { formatDateInput } from "../../core/format"
import type { CalendarInstance } from "../../instance"
import type { CalendarLabels } from "../../types"
import "../../styles/year.css"
import { useSlotClass } from "../classesContext"
import { YearMonth } from "./YearMonth"

export interface YearViewProps<TData = unknown> {
  instance: CalendarInstance<TData>
  labels: CalendarLabels
}

/**
 * Every day that has at least one event, keyed by `formatDateInput`, mapped
 * to how many events touch it.
 *
 * Computed once per `events` array (not per month) so 12 mini months share a
 * single pass over the data instead of each re-scanning every event.
 */
function useEventCountsByDay(events: readonly { start: Date; end: Date }[]): ReadonlyMap<string, number> {
  return useMemo(() => {
    const counts = new Map<string, number>()
    for (const event of events) {
      for (const day of eachDay({ start: event.start, end: event.end })) {
        const key = formatDateInput(day)
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
    }
    return counts
  }, [events])
}

/**
 * The year view: a responsive grid of 12 mini months for the year
 * `instance.date` falls in, each a small clickable calendar with event-count
 * heat tinting.
 *
 * @example
 * <YearView instance={instance} labels={labels} />
 */
export function YearView<TData = unknown>({ instance, labels }: YearViewProps<TData>) {
  const year = instance.date.getFullYear()
  const months = useMemo(() => Array.from({ length: 12 }, (_, month) => new Date(year, month, 1)), [year])
  const countsByDay = useEventCountsByDay(instance.events)
  const viewSlotClass = useSlotClass("view")
  const yearSlotClass = useSlotClass("year")

  return (
    <div className={classNames("cal-year", viewSlotClass, yearSlotClass)} role="grid" aria-label={labels.year}>
      {months.map((monthDate) => (
        <YearMonth key={monthDate.getMonth()} instance={instance} labels={labels} monthDate={monthDate} countsByDay={countsByDay} />
      ))}
    </div>
  )
}
