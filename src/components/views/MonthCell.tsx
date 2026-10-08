import type { MouseEvent } from "react"
import { classNames } from "../../core/classNames"
import { isSameDay, isSameMonth, isWeekend } from "../../core/date"
import { formatDayMonth, formatDateInput } from "../../core/format"
import type { CalendarInstance } from "../../instance"
import { useSlotClass } from "../classesContext"

/** The pixel rect handed back to a create-request, in viewport coordinates. */
export interface CellAnchorRect {
  top: number
  left: number
  width: number
  height: number
}

/** What one day cell needs to draw its head and react to a double-click. */
export interface MonthCellProps<TData = unknown> {
  day: Date
  instance: CalendarInstance<TData>
  /** True while a chip drag is hovering this cell, for the drop-target highlight. */
  isDropTarget: boolean
  onDoubleClickEmpty: (day: Date, anchor: CellAnchorRect) => void
}

/**
 * One day cell's background and head: the day number (or "Mar 1" on the
 * 1st), weekend/other-month/today styling, and the double-click-to-create
 * gesture on empty space.
 *
 * Event chips are not rendered here — they live in a row-wide overlay grid
 * in {@link ../views/MonthRow} so a multi-day span can be a single element
 * spanning several cells. This component only owns the space behind them,
 * which is why a double-click here always means "empty area".
 *
 * @example
 * <MonthCell day={day} instance={instance} isDropTarget={false} onDoubleClickEmpty={handleCreate} />
 */
export function MonthCell<TData = unknown>({ day, instance, isDropTarget, onDoubleClickEmpty }: MonthCellProps<TData>) {
  const { locale } = instance.settings
  const inCurrentMonth = isSameMonth(day, instance.date)
  const isToday = isSameDay(day, instance.settings.now())
  const isFirstOfMonth = day.getDate() === 1

  const handleDoubleClick = (mouseEvent: MouseEvent<HTMLDivElement>): void => {
    const rect = mouseEvent.currentTarget.getBoundingClientRect()
    onDoubleClickEmpty(day, { top: rect.top, left: rect.left, width: rect.width, height: rect.height })
  }

  const slotClass = useSlotClass("monthCell")

  return (
    <div
      className={classNames(
        "cal-month-cell",
        !inCurrentMonth && "cal-month-other",
        isWeekend(day) && "cal-month-weekend",
        isDropTarget && "cal-month-drop",
        slotClass,
      )}
      data-day={formatDateInput(day)}
      onDoubleClick={handleDoubleClick}
    >
      <div className={classNames("cal-month-daynum", isToday && "cal-month-today", isFirstOfMonth && "cal-month-first")}>
        {isFirstOfMonth ? formatDayMonth(day, locale) : day.getDate()}
      </div>
    </div>
  )
}
