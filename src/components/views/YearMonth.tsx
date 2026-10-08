import { Fragment, useMemo } from "react"
import { classNames } from "../../core/classNames"
import { isSameDay, isSameMonth, isoWeek } from "../../core/date"
import { formatDateInput, formatFullDate, formatMonth, formatWeekday } from "../../core/format"
import { fill } from "../../core/labels"
import { visibleDays } from "../../core/range"
import type { CalendarInstance } from "../../instance"
import type { CalendarLabels } from "../../types"

export interface YearMonthProps<TData = unknown> {
  instance: CalendarInstance<TData>
  labels: CalendarLabels
  monthDate: Date
  /** Event counts by `formatDateInput` day key, shared across all 12 months. */
  countsByDay: ReadonlyMap<string, number>
}

/** The heat class for a day's event count: none for 0, `cal-year-heat-1`..`-4` for 1, 2, 3, 4-or-more. */
function heatClass(count: number): string | false {
  return count > 0 && `cal-year-heat-${Math.min(count, 4)}`
}

/** `days` split into 6 rows of 7 — a month's always-42-day grid from {@link visibleDays}. */
function chunkIntoWeeks(days: readonly Date[]): Date[][] {
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  return weeks
}

/**
 * One mini month: a title, a narrow weekday header, and 6 rows of day
 * buttons with an ISO week number at the start of each row. Every day is
 * clickable — it jumps the whole calendar to the day view for that date.
 *
 * @example
 * <YearMonth instance={instance} labels={labels} monthDate={new Date(2022, 2, 1)} countsByDay={counts} />
 */
export function YearMonth<TData = unknown>({ instance, labels, monthDate, countsByDay }: YearMonthProps<TData>) {
  const { locale, weekStartsOn } = instance.settings
  const today = instance.settings.now()
  // Mini months always show the full week, regardless of the showWeekends preference.
  const days = useMemo(() => visibleDays("month", monthDate, weekStartsOn, true), [monthDate, weekStartsOn])
  const weeks = useMemo(() => chunkIntoWeeks(days), [days])
  const weekdayLetters = useMemo(() => days.slice(0, 7).map((day) => formatWeekday(day, locale, "narrow")), [days, locale])

  const handleDayClick = (day: Date): void => {
    instance.setDate(day)
    instance.setView("day")
  }

  return (
    <div className="cal-year-month">
      <div className="cal-year-month-title">{formatMonth(monthDate, locale, "long")}</div>
      <div className="cal-year-grid" role="grid" aria-label={formatMonth(monthDate, locale, "long")}>
        <div className="cal-year-weeknum" aria-hidden="true" />
        {weekdayLetters.map((letter, index) => (
          <div key={index} className="cal-year-weekday">
            {letter}
          </div>
        ))}
        {weeks.map((weekDays) => {
          const firstDay = weekDays[0]
          if (!firstDay) return null
          return (
            <Fragment key={formatDateInput(firstDay)}>
              <div className="cal-year-weeknum">{isoWeek(firstDay)}</div>
              {weekDays.map((day) => {
                const count = countsByDay.get(formatDateInput(day)) ?? 0
                return (
                  <button
                    key={formatDateInput(day)}
                    type="button"
                    className={classNames(
                      "cal-year-day",
                      !isSameMonth(day, monthDate) && "cal-year-day-other",
                      isSameDay(day, today) && "cal-year-today",
                      heatClass(count),
                    )}
                    data-day={formatDateInput(day)}
                    aria-label={`${formatFullDate(day, locale)}, ${fill(labels.eventCount, { n: count })}`}
                    onClick={() => handleDayClick(day)}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
