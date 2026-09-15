import { classNames } from "../../core/classNames"
import { isWeekend } from "../../core/date"
import { formatFullDate, formatWeekday } from "../../core/format"
import { useSlotClass } from "../classesContext"

/** What {@link DayHeader} draws. */
export interface DayHeaderProps {
  day: Date
  locale: string
  isToday: boolean
  /**
   * Called with `day` when the number is clicked. Omit it in day view, where
   * the header already names the only day shown and drilling in goes nowhere.
   */
  onSelect?: ((day: Date) => void) | undefined
}

/**
 * One column heading of the day/week grid: the weekday's short name above a
 * large day number.
 *
 * Weekends take `--cal-weekend-fg` and today gets an accent circle, matching
 * the Bryntum header; both are class-driven so the stylesheet owns the look.
 *
 * @param props - The day, its locale, whether it is today, and the drill-in callback.
 * @returns The header cell.
 *
 * @example
 * <DayHeader day={day} locale="en-GB" isToday onSelect={goToDay} />
 */
export function DayHeader({ day, locale, isToday, onSelect }: DayHeaderProps) {
  const slotClass = useSlotClass("dayHeader")
  const className = classNames("cal-day-header", isWeekend(day) && "cal-weekend", isToday && "cal-today", slotClass)
  const number = day.getDate()

  return (
    <div className={className}>
      <span className="cal-day-header-name">{formatWeekday(day, locale, "short")}</span>
      {onSelect ? (
        <button type="button" className="cal-day-header-number" aria-label={formatFullDate(day, locale)} onClick={() => onSelect(day)}>
          {number}
        </button>
      ) : (
        <span className="cal-day-header-number">{number}</span>
      )}
    </div>
  )
}
