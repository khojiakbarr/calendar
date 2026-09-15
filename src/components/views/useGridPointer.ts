import { snapTo } from "../../core/date"
import type { CalendarSettings } from "../../instance"
import type { CalendarEvent } from "../../types"
import type { AnchorRect } from "./anchor"

/** The three things a pointer can do on the time grid. */
export type GridGesture = "create" | "move" | "resize"

/** The provisional block drawn while a gesture is in flight. */
export interface GridGhost<T> {
  gesture: GridGesture
  /** Day column the ghost sits in. */
  column: number
  startMinutes: number
  endMinutes: number
  /** The event being moved or resized; `null` while creating. */
  event: CalendarEvent<T> | null
}

/** What a gesture remembers from its `pointerdown` until its `pointerup`. */
export interface DragSession<T> {
  gesture: GridGesture
  pointerId: number
  startX: number
  startY: number
  metrics: GridMetrics
  column: number
  /** Snapped minute the press landed on — the fixed edge of a create drag. */
  anchorMinute: number
  /** Unsnapped minute the press landed on — the baseline move/resize deltas are measured from. */
  anchorRawMinute: number
  event: CalendarEvent<T> | null
  /** Minute of day the dragged event starts at. */
  startMinutes: number
  /** `startMinutes` plus the event's length; may pass 1440 when it crosses midnight. */
  endMinutes: number
}

/**
 * Everything a pointer gesture needs to know about the time grid's geometry,
 * frozen at the moment the gesture started.
 *
 * Taken once per gesture rather than per `pointermove`: `getBoundingClientRect`
 * forces layout, and a drag fires dozens of moves a second. The grid cannot
 * resize mid-drag (the pointer is captured), so a snapshot stays truthful.
 */
export interface GridMetrics {
  /** Viewport y of the body's top edge. */
  top: number
  /** Body height in pixels — the whole drawn day, `startMinute` to `endMinute`. */
  height: number
  /** Viewport x where the first day column begins (past the hour gutter). */
  columnsLeft: number
  /** Width of one day column in pixels. */
  columnWidth: number
  /** How many day columns the grid has. */
  columnCount: number
  /** Minute of day at the top of the grid (`dayStartHour * 60`). */
  startMinute: number
  /** Minute of day at the bottom of the grid (`dayEndHour * 60`). */
  endMinute: number
  /** Gestures round to this many minutes. */
  snapMinutes: number
}

/** `value` forced into `[min, max]`. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Measures the grid for a gesture that started inside `column`.
 *
 * The columns' left edge is derived from the hit column rather than from the
 * gutter token: the column knows its own index, so `left - index * width`
 * gives the origin in one measurement, and the math keeps working if the
 * gutter width ever changes.
 *
 * @param body - The `.cal-timegrid-body` grid element.
 * @param column - The `.cal-timegrid-col` the pointer went down on.
 * @param columnIndex - That column's index within `days`.
 * @param columnCount - How many day columns are drawn.
 * @param settings - Supplies the drawn hours and the snap step.
 * @returns A geometry snapshot for the rest of the gesture.
 */
export function measureGrid(
  body: HTMLElement,
  column: HTMLElement,
  columnIndex: number,
  columnCount: number,
  settings: CalendarSettings,
): GridMetrics {
  const bodyRect = body.getBoundingClientRect()
  const columnRect = column.getBoundingClientRect()
  return {
    top: bodyRect.top,
    height: bodyRect.height,
    columnsLeft: columnRect.left - columnIndex * columnRect.width,
    columnWidth: columnRect.width,
    columnCount,
    startMinute: settings.dayStartHour * 60,
    endMinute: settings.dayEndHour * 60,
    snapMinutes: settings.snapMinutes,
  }
}

/**
 * The minute of day under `clientY`, before snapping.
 *
 * The grid draws `endMinute - startMinute` minutes across `height` pixels, so
 * the position is a plain proportion. Kept unsnapped for drags, which measure
 * how far the pointer moved and snap the difference — snapping both ends
 * would quantise the same movement twice and make the chip stutter.
 *
 * @param metrics - Geometry from {@link measureGrid}.
 * @param clientY - Viewport y of the pointer.
 * @returns A minute of day, clamped to the drawn window.
 */
export function rawMinuteAt(metrics: GridMetrics, clientY: number): number {
  const total = metrics.endMinute - metrics.startMinute
  // A zero-height body (never laid out) would divide by zero; treat it as the top.
  const ratio = metrics.height > 0 ? (clientY - metrics.top) / metrics.height : 0
  return clamp(metrics.startMinute + ratio * total, metrics.startMinute, metrics.endMinute)
}

/**
 * The snapped minute of day under `clientY` — where a click or a gesture's
 * anchor lands.
 *
 * @param metrics - Geometry from {@link measureGrid}.
 * @param clientY - Viewport y of the pointer.
 * @returns A minute of day on a `snapMinutes` boundary, inside the drawn window.
 */
export function minuteAt(metrics: GridMetrics, clientY: number): number {
  const snapped = snapTo(rawMinuteAt(metrics, clientY), metrics.snapMinutes)
  return clamp(snapped, metrics.startMinute, metrics.endMinute)
}

/**
 * The day column under `clientX`.
 *
 * @param metrics - Geometry from {@link measureGrid}.
 * @param clientX - Viewport x of the pointer.
 * @returns A column index, clamped to the grid so dragging off the edge parks
 *   on the first or last day instead of leaving the calendar.
 */
export function columnAt(metrics: GridMetrics, clientX: number): number {
  if (metrics.columnWidth <= 0) return 0 // unlaid-out grid: everything is column 0
  const index = Math.floor((clientX - metrics.columnsLeft) / metrics.columnWidth)
  return clamp(index, 0, Math.max(0, metrics.columnCount - 1))
}

/**
 * The viewport rectangle a time slot occupies — what a popover opened by a
 * drag or a double-click anchors to.
 *
 * @param metrics - Geometry from {@link measureGrid}.
 * @param column - Day column index.
 * @param startMinutes - Minute of day the slot starts at.
 * @param endMinutes - Minute of day the slot ends at.
 * @returns The slot's position and size in viewport pixels.
 */
export function slotRect(metrics: GridMetrics, column: number, startMinutes: number, endMinutes: number): AnchorRect {
  const total = metrics.endMinute - metrics.startMinute
  const perMinute = total > 0 ? metrics.height / total : 0
  return {
    top: metrics.top + (startMinutes - metrics.startMinute) * perMinute,
    left: metrics.columnsLeft + column * metrics.columnWidth,
    width: metrics.columnWidth,
    height: (endMinutes - startMinutes) * perMinute,
  }
}

/**
 * Where the ghost sits for the pointer's current position.
 *
 * @param session - The gesture's `pointerdown` snapshot.
 * @param clientX - Viewport x of the pointer.
 * @param clientY - Viewport y of the pointer.
 * @returns The block to draw, and to commit if the pointer is released here.
 */
export function ghostFor<T>(session: DragSession<T>, clientX: number, clientY: number): GridGhost<T> {
  const { metrics, gesture, event } = session
  if (gesture === "create") {
    // Both edges snap to absolute boundaries: a created event should land on the
    // grid lines the user sees, whichever direction they swept.
    const current = minuteAt(metrics, clientY)
    const startMinutes = Math.min(session.anchorMinute, current)
    const endMinutes = Math.max(Math.max(session.anchorMinute, current), startMinutes + metrics.snapMinutes)
    return { gesture, column: session.column, startMinutes, endMinutes, event: null }
  }
  // Existing events move by a snapped *delta* instead of snapping their edges, so
  // an event that starts at 09:05 stays at :05 and only shifts by whole steps.
  const delta = snapTo(rawMinuteAt(metrics, clientY) - session.anchorRawMinute, metrics.snapMinutes)
  if (gesture === "move") {
    const column = columnAt(metrics, clientX)
    return { gesture, column, startMinutes: session.startMinutes + delta, endMinutes: session.endMinutes + delta, event }
  }
  const endMinutes = Math.max(session.endMinutes + delta, session.startMinutes + metrics.snapMinutes)
  return { gesture, column: session.column, startMinutes: session.startMinutes, endMinutes, event }
}
