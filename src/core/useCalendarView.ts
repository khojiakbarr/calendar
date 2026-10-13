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
  /** The day anchored, held by the host (an address, a store); given, it wins over the calendar's own. */
  date?: Date | undefined
  /** Told every move — a step, «Today», a day picked — whether or not the host holds the date. */
  onDateChange?: ((date: Date) => void) | undefined
  /** The host's clock: where the calendar opens without `initialDate`, and where «Today» goes. */
  now: () => Date
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
 * surprise rather than a convenience. A host that wants it kept — in the
 * page's address, where a link means it — holds it itself (`date`, told of
 * each move through `onDateChange`).
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
  date: heldDate,
  onDateChange,
  now,
}: UseCalendarViewOptions): CalendarViewState {
  const [ownDate, setDateState] = useState<Date>(() => initialDate ?? now())
  // A held date is usually parsed afresh on every render of the host (from its address): one instant, one object,
  // or every range below would be new each render and the loader would think the view moved.
  const time = (heldDate ?? ownDate).getTime()
  const date = useMemo(() => new Date(time), [time])
  // Read through a ref so «Today» keeps one identity even when a host passes an inline clock.
  const nowRef = useRef(now)
  nowRef.current = now
  const onDateChangeRef = useRef(onDateChange)
  onDateChangeRef.current = onDateChange
  // Where the next step starts: the date shown, or one just moved to and not drawn yet (two quick clicks).
  const dateRef = useRef(date)
  dateRef.current = date

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

  const moveTo = useCallback((next: Date) => {
    dateRef.current = next
    setDateState(next)
    onDateChangeRef.current?.(next)
  }, [])
  const setDate = useCallback((next: Date) => moveTo(next), [moveTo])
  const goToday = useCallback(() => moveTo(nowRef.current()), [moveTo])
  const goNext = useCallback(() => moveTo(shiftDate(viewRef.current, dateRef.current, 1)), [moveTo])
  const goPrevious = useCallback(() => moveTo(shiftDate(viewRef.current, dateRef.current, -1)), [moveTo])

  return { date, range, days, window, setDate, goToday, goNext, goPrevious }
}
