import { useEffect, useState } from "react"
import { minutesOfDay } from "../../core/date"

/** How often the line moves. A minute is the finest the grid can show anyway. */
const TICK_MS = 60_000

/** What {@link NowLine} needs to place itself. */
export interface NowLineProps {
  /** First hour drawn on the grid. */
  dayStartHour: number
  /** Hour the grid ends at. */
  dayEndHour: number
  /** The calendar's clock (`settings.now`). */
  now: () => Date
}

/**
 * The red "now" marker drawn across today's column.
 *
 * Keeps its own clock rather than taking the time as a prop: the surrounding
 * grid has no reason to re-render every minute, and this is the only thing on
 * screen that goes stale on its own.
 *
 * @param props - The drawn hour window; the line hides outside it.
 * @returns The marker, or `null` when now falls outside the grid.
 *
 * @example
 * {isToday && <NowLine dayStartHour={0} dayEndHour={24} now={settings.now} />}
 */
export function NowLine({ dayStartHour, dayEndHour, now: readNow }: NowLineProps) {
  const [now, setNow] = useState<Date>(() => readNow())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(readNow()), TICK_MS)
    return () => window.clearInterval(timer)
  }, [readNow])

  const minutes = minutesOfDay(now)
  const startMinutes = dayStartHour * 60
  if (minutes < startMinutes || minutes > dayEndHour * 60) return null

  return (
    <div className="cal-now-line" style={{ top: `calc(var(--cal-hour-height) * ${(minutes - startMinutes) / 60})` }} aria-hidden="true">
      <span className="cal-now-dot" />
    </div>
  )
}
