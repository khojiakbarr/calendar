import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { RefObject } from "react"
import { classNames } from "../../core/classNames"
import { addDays, isWeekend, startOfDay } from "../../core/date"
import { formatDateInput, formatWeekday } from "../../core/format"
import type { CalendarInstance } from "../../instance"
import type { CalendarEvent, CalendarLabels, EventDraft } from "../../types"
import "../../styles/month.css"
import { useSlotClass } from "../classesContext"
import type { CellAnchorRect } from "./MonthCell"
import { MonthRow } from "./MonthRow"
import { useMonthDrag } from "./useMonthDrag"

/** Height, in px, of one packed event row inside a cell (20px chip + 2px gap) — must match `month.css`. */
const SEGMENT_ROW_STEP_PX = 22
/** Space, in px, reserved at the top of a cell for the day-number head — must match `month.css`. */
const DAY_HEAD_HEIGHT_PX = 20
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
}

/** Splits `items` into consecutive chunks of `size`, the week rows of a flat day list. */
function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size))
  return rows
}

/**
 * Measures how many event rows fit in a month cell by watching the weeks
 * container's height (all 6 rows share it equally, via `flex: 1`) and
 * recomputing on resize.
 *
 * A real `ResizeObserver` is unavailable in some test environments, and a
 * `rowLimit` override lets tests skip layout measurement entirely — both
 * fall back to a fixed row count instead.
 */
function useMeasuredMaxRows(containerRef: RefObject<HTMLDivElement | null>, rowCount: number, override: number | undefined): number {
  const [measured, setMeasured] = useState(FALLBACK_MAX_ROWS)

  useEffect(() => {
    if (override !== undefined) return
    const container = containerRef.current
    if (!container || rowCount === 0 || typeof ResizeObserver === "undefined") return

    const updateMaxRows = (): void => {
      const rowHeight = container.clientHeight / rowCount
      const available = rowHeight - DAY_HEAD_HEIGHT_PX
      setMeasured(Math.max(1, Math.floor(available / SEGMENT_ROW_STEP_PX)))
    }
    updateMaxRows()
    const observer = new ResizeObserver(updateMaxRows)
    observer.observe(container)
    return () => observer.disconnect()
  }, [containerRef, rowCount, override])

  return override ?? measured
}

/**
 * The month grid: a header of weekday names, then 6 week rows filling the
 * available height, each with an ISO week-number cell and day cells
 * carrying event segments and a "+N more" overflow button.
 *
 * Drag-to-move lives in {@link useMonthDrag}; row layout and event chips
 * live in {@link MonthRow} so a multi-day span can render as one element
 * spanning several day cells.
 *
 * @example
 * <MonthView instance={instance} labels={labels} onEventOpen={openEditor} onCreateRequest={openCreate} onEventHover={showTooltip} />
 */
export function MonthView<TData = unknown>({ instance, labels, onEventOpen, onCreateRequest, onEventHover, rowLimit }: MonthViewProps<TData>) {
  const columns = instance.showWeekends ? 7 : 5
  const weeks = useMemo(() => chunk(instance.days, columns), [instance.days, columns])
  const weekdayHeaders = weeks[0] ?? []

  const weeksRef = useRef<HTMLDivElement | null>(null)
  const maxRows = useMeasuredMaxRows(weeksRef, weeks.length, rowLimit)

  const daysByKey = useMemo(() => new Map(instance.days.map((day) => [formatDateInput(day), day] as const)), [instance.days])
  const drag = useMonthDrag(instance, daysByKey)

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
    <div className={classNames("cal-month", viewSlotClass, monthSlotClass)}>
      <div className="cal-month-headerrow" role="row">
        <div className="cal-month-weeknum-spacer" aria-hidden="true" />
        {weekdayHeaders.map((day) => (
          <div key={formatDateInput(day)} className={classNames("cal-month-headercell", isWeekend(day) && "cal-month-weekend-header")}>
            {formatWeekday(day, instance.settings.locale, "short")}
          </div>
        ))}
      </div>
      <div className="cal-month-weeks" ref={weeksRef} role="grid" aria-label={labels.month}>
        {weeks.map((weekDays, rowIndex) => (
          <MonthRow
            key={weekDays[0] ? formatDateInput(weekDays[0]) : rowIndex}
            instance={instance}
            labels={labels}
            days={weekDays}
            columns={columns}
            maxRows={maxRows}
            dropDayKey={drag.dragState?.overDayKey ?? null}
            drag={drag}
            onEventOpen={onEventOpen}
            onEventHover={onEventHover}
            onCreateRequest={handleCreateRequest}
          />
        ))}
      </div>
    </div>
  )
}
