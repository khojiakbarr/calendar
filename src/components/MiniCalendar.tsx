import { useEffect, useState } from "react"
import type { CalendarInstance } from "../instance"
import type { CalendarLabels, WeekDay } from "../types"
import { addDays, addMonths, addYears, isSameDay, isSameMonth, isWeekend, startOfMonth, startOfWeek } from "../core/date"
import { formatTitle, formatWeekday } from "../core/format"
import { classNames } from "../core/classNames"
import { useSlotClass } from "./classesContext"

const WEEKS_SHOWN = 6
const DAYS_PER_WEEK = 7
const GRID_CELL_COUNT = WEEKS_SHOWN * DAYS_PER_WEEK

export interface MiniCalendarProps<TData = unknown> {
  instance: CalendarInstance<TData>
  labels: CalendarLabels
}

/**
 * The sidebar's small month picker.
 *
 * The month it shows follows `instance.date` — jumping there whenever the
 * main view navigates elsewhere — but stepping the « ‹ › » controls only
 * moves this calendar's own displayed month; it does not move the main view
 * until a day is actually clicked.
 */
export function MiniCalendar<TData = unknown>({ instance, labels }: MiniCalendarProps<TData>) {
  const { weekStartsOn, locale } = instance.settings
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(instance.date))
  const today = instance.settings.now()

  useEffect(() => {
    setVisibleMonth(startOfMonth(instance.date))
    // Depend on the timestamp, not the Date object: the anchor date is what
    // should drive this, not whichever reference identity useCalendar hands
    // back on a given render.
  }, [instance.date.getTime()])

  const weeks = chunk(monthGridDays(visibleMonth, weekStartsOn), DAYS_PER_WEEK)
  const weekdays = weekdayHeaders(visibleMonth, weekStartsOn, locale)
  const slotClass = useSlotClass("miniCalendar")

  return (
    <div className={classNames("cal-mini", slotClass)}>
      <div className="cal-mini-header">
        <button type="button" className="cal-icon-btn" aria-label={`${labels.previous} ${labels.year}`} onClick={() => setVisibleMonth((month) => addYears(month, -1))}>
          «
        </button>
        <button type="button" className="cal-icon-btn" aria-label={`${labels.previous} ${labels.month}`} onClick={() => setVisibleMonth((month) => addMonths(month, -1))}>
          ‹
        </button>
        <span className="cal-mini-title">{formatTitle("month", visibleMonth, locale)}</span>
        <button type="button" className="cal-icon-btn" aria-label={`${labels.next} ${labels.month}`} onClick={() => setVisibleMonth((month) => addMonths(month, 1))}>
          ›
        </button>
        <button type="button" className="cal-icon-btn" aria-label={`${labels.next} ${labels.year}`} onClick={() => setVisibleMonth((month) => addYears(month, 1))}>
          »
        </button>
      </div>
      <div className="cal-mini-grid" role="grid">
        <div className="cal-mini-row" role="row">
          {weekdays.map((weekday, index) => (
            <span key={index} role="columnheader" className={classNames("cal-mini-weekday", weekday.isWeekend && "cal-mini-weekend")}>
              {weekday.letter}
            </span>
          ))}
        </div>
        {weeks.map((week, rowIndex) => (
          <div key={rowIndex} role="row" className="cal-mini-row">
            {week.map((day) => (
              <button
                key={day.toISOString()}
                type="button"
                role="gridcell"
                className={classNames(
                  "cal-mini-day",
                  isWeekend(day) && "cal-mini-weekend",
                  !isSameMonth(day, visibleMonth) && "cal-mini-other",
                  isSameDay(day, today) && "cal-mini-today",
                  isSameDay(day, instance.date) && "cal-mini-selected",
                )}
                onClick={() => instance.setDate(day)}
              >
                {day.getDate()}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Every cell of the 6-week grid, in order, including the leading/trailing days of neighbouring months. */
function monthGridDays(month: Date, weekStartsOn: WeekDay): Date[] {
  const start = startOfWeek(startOfMonth(month), weekStartsOn)
  return Array.from({ length: GRID_CELL_COUNT }, (_, index) => addDays(start, index))
}

interface MiniWeekday {
  letter: string
  isWeekend: boolean
}

/** The narrow weekday initials for the header row, starting at `weekStartsOn`. */
function weekdayHeaders(month: Date, weekStartsOn: WeekDay, locale: string): MiniWeekday[] {
  const start = startOfWeek(startOfMonth(month), weekStartsOn)
  return Array.from({ length: DAYS_PER_WEEK }, (_, index) => {
    const day = addDays(start, index)
    return { letter: formatWeekday(day, locale, "narrow"), isWeekend: isWeekend(day) }
  })
}

/** `items` split into consecutive chunks of `size`, the last one short if it does not divide evenly. */
function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}
