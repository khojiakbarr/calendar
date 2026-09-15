import { useRef, useContext } from "react"
import { createPortal } from "react-dom"
import { CalendarThemeContext } from "./themeContext"
import { classNames } from "../core/classNames"
import { spansWholeDays } from "../core/date"
import { formatFullDate, formatTimeRange } from "../core/format"
import type { CalendarEvent, CalendarLabels } from "../types"
import { useSlotClass } from "./classesContext"
import type { AnchorRect } from "./Popover"
import { usePlacement } from "./usePlacement"
import "../styles/popover.css"

export interface EventTooltipProps<T> {
  event: CalendarEvent<T>
  anchor: AnchorRect
  /** The event's resolved colour (own colour, else its resource's), for the swatch dot. */
  color: string
  resourceName?: string
  locale: string
  labels: CalendarLabels
}

/**
 * A read-only hover card for one event: its name, full date, time range (or
 * "All day"), and resource with a colour dot.
 *
 * Purely presentational — no focus handling or close behaviour, unlike
 * {@link Popover} which it otherwise mirrors for placement by sharing
 * {@link usePlacement}. Pair it with `useHoverIntent` so it only appears
 * after the pointer lingers, and unmount it (rather than hide with CSS) once
 * the hover ends.
 *
 * @example
 * {hover.target ? (
 *   <EventTooltip event={hover.target.event} anchor={hover.target.anchor}
 *     color={colorOf(hover.target.event)} locale={locale} labels={labels} />
 * ) : null}
 */
export function EventTooltip<T>({ event, anchor, color, resourceName, locale, labels }: EventTooltipProps<T>) {
  const ref = useRef<HTMLDivElement>(null)
  const position = usePlacement(anchor, ref)
  const timeLine = spansWholeDays(event) ? labels.allDay : formatTimeRange(event.start, event.end, locale)

  const theme = useContext(CalendarThemeContext)
  const slotClass = useSlotClass("tooltip")
  return createPortal(
    // The wrapper is a token carrier only: `cal-floating` makes it draw nothing.
    <div className="cal-root cal-floating" data-theme={theme}>
    <div
      ref={ref}
      role="tooltip"
      className={classNames("cal-tooltip", slotClass)}
      style={{ position: "fixed", top: position.top, left: position.left }}
    >
      <div className="cal-tooltip-name">{event.name}</div>
      <div className="cal-tooltip-date">{formatFullDate(event.start, locale)}</div>
      <div className="cal-tooltip-time">{timeLine}</div>
      {resourceName ? (
        <div className="cal-tooltip-resource">
          <span className="cal-tooltip-dot" style={{ backgroundColor: color }} aria-hidden="true" />
          {resourceName}
        </div>
      ) : null}
    </div>
    </div>,
    document.body,
  )
}
