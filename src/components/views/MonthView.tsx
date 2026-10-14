import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react"
import type { RefObject } from "react"
import { classNames } from "../../core/classNames"
import { addDays, isWeekend, startOfDay } from "../../core/date"
import { formatDateInput, formatWeekday } from "../../core/format"
import type { CalendarInstance } from "../../instance"
import type { CalendarEvent, CalendarLabels, EventDraft } from "../../types"
import "../../styles/month.css"
import { useSlotClass } from "../classesContext"
import { COMPACT_QUERY, useMediaQuery } from "../useMediaQuery"
import type { CellAnchorRect } from "./MonthCell"
import { MonthRow, type MonthRowLimits } from "./MonthRow"
import { useMonthDrag } from "./useMonthDrag"
import { useOpenDay } from "./useOpenDay"

/** Height, in px, of one packed event row inside a cell (20px chip + 2px gap) — must match `month.css`. */
const SEGMENT_ROW_STEP_PX = 22
/** Space, in px, reserved at the top of a cell for the day-number head — must match `month.css`. */
const DAY_HEAD_HEIGHT_PX = 28
/**
 * The overflow dots' line under the event rows (`.cal-month-more`, 14px, in a grid row of its own) with the grid's
 * 2px bottom padding — must match `month.css`. Counted at its own height, not as one more 22px event row: a 110px
 * week fits three events and the dots, where it showed two and left 16px empty.
 */
const MORE_LINE_PX = 14 + 2
/** Used before the grid has been measured, or when `ResizeObserver` is unavailable. */
const FALLBACK_MAX_ROWS = 3

export interface MonthViewProps<TData = unknown> {
  instance: CalendarInstance<TData>
  labels: CalendarLabels
  onEventOpen: (event: CalendarEvent<TData>, anchor: HTMLElement) => void
  onCreateRequest: (draft: EventDraft<TData>, anchor: CellAnchorRect) => void
  onEventHover: (event: CalendarEvent<TData> | null, anchor: HTMLElement | null) => void
  /** Test-only escape hatch: skips `ResizeObserver` measurement and forces this many event rows per cell. */
  rowLimit?: number
  /**
   * Forces the ≤640px compact layout (narrow weekday letters, no week-number
   * column, event chips as dots) on or off. Omit it to follow `COMPACT_QUERY`
   * automatically — the override exists mainly so tests and a caller that
   * already tracks its own breakpoint don't need to fight this component's
   * own `useMediaQuery` read.
   */
  compact?: boolean
}

/** Splits `items` into consecutive chunks of `size`, the week rows of a flat day list. */
function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size))
  return rows
}

/**
 * How many event rows a week of this height holds — all of them, or beside the overflow dots' line. A week that
 * overflows keeps a line for its dots, or they fall under the row's edge and cannot be clicked.
 *
 * @example
 * monthRowLimits(110) // { maxRows: 3, rowsBesideMore: 3 }
 */
export function monthRowLimits(rowHeight: number): MonthRowLimits {
  const available = rowHeight - DAY_HEAD_HEIGHT_PX
  return {
    maxRows: Math.max(1, Math.floor(available / SEGMENT_ROW_STEP_PX)),
    rowsBesideMore: Math.max(0, Math.floor((available - MORE_LINE_PX) / SEGMENT_ROW_STEP_PX)),
  }
}

/**
 * Measures how many event rows fit in a month cell — and how many beside the
 * overflow dots' line — by watching the weeks
 * container's height (all 6 rows share it equally, via `flex: 1`) and
 * recomputing on resize.
 *
 * A real `ResizeObserver` is unavailable in some test environments, and a
 * `rowLimit` override lets tests skip layout measurement entirely — both
 * fall back to a fixed row count instead.
 */
function useMeasuredMaxRows(containerRef: RefObject<HTMLDivElement | null>, rowCount: number, override: number | undefined): MonthRowLimits {
  const [measured, setMeasured] = useState<MonthRowLimits>({ maxRows: FALLBACK_MAX_ROWS, rowsBesideMore: FALLBACK_MAX_ROWS - 1 })

  useEffect(() => {
    if (override !== undefined) return
    const container = containerRef.current
    if (!container || rowCount === 0 || typeof ResizeObserver === "undefined") return

    const updateMaxRows = (): void => {
      const { maxRows, rowsBesideMore } = monthRowLimits(container.clientHeight / rowCount)
      setMeasured((current) => (current.maxRows === maxRows && current.rowsBesideMore === rowsBesideMore ? current : { maxRows, rowsBesideMore }))
    }
    updateMaxRows()
    const observer = new ResizeObserver(updateMaxRows)
    observer.observe(container)
    return () => observer.disconnect()
  }, [containerRef, rowCount, override])

  // A test's fixed limit is the rows shown beside the dots too: it measures nothing.
  return override !== undefined ? { maxRows: override, rowsBesideMore: override } : measured
}

/**
 * The month grid: a header of weekday names, then 6 week rows filling the
 * available height, each with an ISO week-number cell and day cells
 * carrying event segments and, for a day that overflows, its dots and the
 * card that lists the whole day.
 *
 * Drag-to-move lives in {@link useMonthDrag}; row layout and event chips
 * live in {@link MonthRow} so a multi-day span can render as one element
 * spanning several day cells.
 *
 * @example
 * <MonthView instance={instance} labels={labels} onEventOpen={openEditor} onCreateRequest={openCreate} onEventHover={showTooltip} />
 */
export function MonthView<TData = unknown>({
  instance,
  labels,
  onEventOpen,
  onCreateRequest,
  onEventHover,
  rowLimit,
  compact: compactOverride,
}: MonthViewProps<TData>) {
  const isNarrow = useMediaQuery(COMPACT_QUERY)
  const compact = compactOverride ?? isNarrow

  const columns = instance.showWeekends ? 7 : 5
  const weeks = useMemo(() => chunk(instance.days, columns), [instance.days, columns])
  const weekdayHeaders = weeks[0] ?? []

  const weeksRef = useRef<HTMLDivElement | null>(null)
  const { maxRows, rowsBesideMore } = useMeasuredMaxRows(weeksRef, weeks.length, rowLimit)

  const daysByKey = useMemo(() => new Map(instance.days.map((day) => [formatDateInput(day), day] as const)), [instance.days])

  // One day card at a time. Kept with the days it was opened over: another month's grid shows none.
  const { openDay, openDayCard, closeDayCard } = useOpenDay(instance.days)
  const drag = useMonthDrag(instance, daysByKey)

  /**
   * Compact mode opens a day by clicking its cell, but `MonthRow`/`MonthCell`
   * (owned elsewhere) don't take a per-cell callback for that — so this
   * delegates from the one container this view does own. Event chips and the
   * overflow dots live in a sibling overlay, not inside `.cal-month-cell`,
   * so `closest(".cal-month-cell")` only ever matches an actual cell click.
   */
  const handleWeeksClick = useCallback(
    (mouseEvent: MouseEvent<HTMLDivElement>): void => {
      if (!compact) return
      const cell = (mouseEvent.target as HTMLElement).closest<HTMLElement>(".cal-month-cell")
      const dayKey = cell?.dataset["day"]
      const day = dayKey ? daysByKey.get(dayKey) : undefined
      if (!day) return
      instance.setDate(day)
      instance.setView("day")
    },
    [compact, daysByKey, instance],
  )

  const firstVisibleResourceId = useMemo(
    () => instance.resources.find((resource) => !instance.hiddenResourceIds.includes(resource.id))?.id,
    [instance.resources, instance.hiddenResourceIds],
  )

  const handleCreateRequest = useCallback(
    (day: Date, anchor: CellAnchorRect): void => {
      const start = startOfDay(day)
      const draft: EventDraft<TData> = {
        name: "",
        start,
        end: addDays(start, 1),
        allDay: true,
        ...(firstVisibleResourceId !== undefined ? { resourceId: firstVisibleResourceId } : {}),
      }
      onCreateRequest(draft, anchor)
    },
    [firstVisibleResourceId, onCreateRequest],
  )

  const viewSlotClass = useSlotClass("view")
  const monthSlotClass = useSlotClass("month")

  return (
    <div className={classNames("cal-month", viewSlotClass, monthSlotClass, compact && "cal-month-compact")}>
      <div className="cal-month-headerrow" role="row">
        <div className="cal-month-weeknum-spacer" aria-hidden="true" />
        {weekdayHeaders.map((day) => (
          <div key={formatDateInput(day)} className={classNames("cal-month-headercell", isWeekend(day) && "cal-month-weekend-header")}>
            {formatWeekday(day, instance.settings.locale, compact ? "narrow" : "short")}
          </div>
        ))}
      </div>
      <div className="cal-month-weeks" ref={weeksRef} role="grid" aria-label={labels.month} onClick={handleWeeksClick}>
        {weeks.map((weekDays, rowIndex) => (
          <MonthRow
            key={weekDays[0] ? formatDateInput(weekDays[0]) : rowIndex}
            instance={instance}
            labels={labels}
            days={weekDays}
            columns={columns}
            maxRows={maxRows}
            rowsBesideMore={rowsBesideMore}
            compact={compact}
            dropDayKey={drag.dragState?.overDayKey ?? null}
            drag={drag}
            onEventOpen={onEventOpen}
            onEventHover={onEventHover}
            onCreateRequest={handleCreateRequest}
            openDay={openDay}
            onDayOpen={openDayCard}
            onDayClose={closeDayCard}
          />
        ))}
      </div>
    </div>
  )
}
