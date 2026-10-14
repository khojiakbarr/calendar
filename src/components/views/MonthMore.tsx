import type { CSSProperties, MouseEvent } from "react"
import { classNames } from "../../core/classNames"
import { fill } from "../../core/labels"
import type { Segment } from "../../core/spans"
import type { CalendarInstance } from "../../instance"
import type { CalendarLabels } from "../../types"

/** How many hidden events get a dot of their own before the rest are a count — fewer in a phone's narrow cell. */
export const MORE_DOTS = { wide: 4, compact: 2 } as const

export interface MonthMoreProps<TData = unknown> {
  /** The column's segments that did not fit, in the cell's order. */
  hidden: readonly Segment<TData>[]
  col: number
  row: number
  isOpen: boolean
  /** A phone's month: its cells hold two dots beside the count. */
  compact: boolean
  labels: CalendarLabels
  instance: CalendarInstance<TData>
  onOpen: (anchor: HTMLElement) => void
  /** A placement class beside `cal-month-more`: the time grid's all-day strip passes `cal-allday-more`. */
  className?: string
}

/**
 * A day's overflow: a dot in the colour of each hidden event — four at most,
 * two on a phone — then "+N" for the rest, so what did not fit can be told
 * apart before it is opened: a red dot is something late, a ring a plan. A
 * click opens the day's card ({@link DayEventsPopover}). A month cell's and the
 * time grid's all-day strip's alike. Its name is still the
 * `more` label with the whole count, so a screen reader hears "+6 more", not
 * the dots.
 *
 * @example
 * <MonthMore hidden={hidden} col={2} row={maxRows} isOpen={false} compact={false} labels={labels} instance={instance} onOpen={open} />
 */
export function MonthMore<TData = unknown>({ hidden, col, row, isOpen, compact, labels, instance, onOpen, className }: MonthMoreProps<TData>) {
  const dots = hidden.slice(0, compact ? MORE_DOTS.compact : MORE_DOTS.wide)
  const rest = hidden.length - dots.length

  const handleClick = (mouseEvent: MouseEvent<HTMLButtonElement>): void => {
    // The cell behind would read a click as its own (a compact month opens its day).
    mouseEvent.stopPropagation()
    onOpen(mouseEvent.currentTarget)
  }

  return (
    <button
      type="button"
      className={classNames("cal-month-more", className)}
      style={{ gridColumn: col + 1, gridRow: row + 1 }}
      aria-label={fill(labels.more, { n: hidden.length })}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      onClick={handleClick}
    >
      {dots.map(({ event }) => (
        <span
          key={event.id}
          aria-hidden="true"
          className={classNames("cal-month-more-dot", event.appearance === "plan" && "cal-month-more-dot-plan", event.className)}
          style={{ "--cal-event-color": instance.colorOf(event) } as CSSProperties}
        />
      ))}
      {rest > 0 ? (
        <span className="cal-month-more-count" aria-hidden="true">
          +{rest}
        </span>
      ) : null}
    </button>
  )
}
