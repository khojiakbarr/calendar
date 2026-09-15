import { useCallback, useMemo, useRef, useState } from "react"
import { loadWindow, shiftDate, visibleDays, visibleRange } from "./range"
import type { CalendarView, DateRange, WeekDay } from "../types"

/** Options for {@link useCalendarView}. */
export interface UseCalendarViewOptions {
  view: CalendarView
  weekStartsOn: WeekDay
  showWeekends: boolean
  /** The day first anchored. Defaults to today. */
  initialDate?: Date | undefined
}

/** Where the calendar is pointing, and the four ways to move it. */
export interface CalendarViewState {
  date: Date
  /** What the view covers; for `month` that is its 6-week grid. */
  range: DateRange
  /** The day cells drawn, weekends already removed when hidden. */
  days: Date[]
  /** `range` widened to whole weeks: what the server is actually asked for. */
  window: DateRange
  setDate(date: Date): void
  goToday(): void
  goNext(): void
  goPrevious(): void
}

/**
 * The anchor date and everything derived from it.
 *
 * Kept apart from preferences because it is deliberately not persisted:
 * reopening a calendar on the day someone last looked at, weeks ago, is a
 * surprise rather than a convenience.
 *
 * @param options - See {@link UseCalendarViewOptions}.
 * @returns The anchored date, the intervals it implies, and stable navigation
 *   actions that keep working across a view switch.
 */
export function useCalendarView({
  view,
  weekStartsOn,
  showWeekends,
  initialDate,
}: UseCalendarViewOptions): CalendarViewState {
  const [date, setDateState] = useState<Date>(() => initialDate ?? new Date())

  const range = useMemo(() => visibleRange(view, date, weekStartsOn), [view, date, weekStartsOn])
  const days = useMemo(
    () => visibleDays(view, date, weekStartsOn, showWeekends),
    [view, date, weekStartsOn, showWeekends],
  )
  const window = useMemo(() => loadWindow(range, weekStartsOn), [range, weekStartsOn])

  // The view is read when the action runs rather than closed over, so "next"
  // stays the same function across a view switch — components memoised on it
  // do not re-render, and the button keeps its identity.
  const viewRef = useRef(view)
  viewRef.current = view

  const setDate = useCallback((next: Date) => setDateState(next), [])
  const goToday = useCallback(() => setDateState(new Date()), [])
  const goNext = useCallback(() => setDateState((previous) => shiftDate(viewRef.current, previous, 1)), [])
  const goPrevious = useCallback(() => setDateState((previous) => shiftDate(viewRef.current, previous, -1)), [])

  return { date, range, days, window, setDate, goToday, goNext, goPrevious }
}
