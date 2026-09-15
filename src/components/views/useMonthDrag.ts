import { useCallback, useEffect, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"
import { addDays, differenceInCalendarDays, isSameDay } from "../../core/date"
import type { CalendarInstance } from "../../instance"
import type { CalendarEvent } from "../../types"

/** Pixels the pointer must travel before a pointerdown on a chip becomes a drag rather than a click. */
const DRAG_THRESHOLD_PX = 4

/** One in-progress pointer session, kept in a ref so moves don't cause re-renders until they cross the threshold. */
interface DragSession<TData> {
  event: CalendarEvent<TData>
  dragging: boolean
  startX: number
  startY: number
}

/** The day currently under the pointer, for the drop-target highlight — `null` once nothing is being dragged. */
export interface MonthDragState {
  eventId: string
  overDayKey: string | null
}

/** Pointer handlers for a single chip; every field is a no-op when the chip cannot be dragged. */
export interface MonthDragHandlers {
  onPointerDown: (pointerEvent: ReactPointerEvent<HTMLElement>) => void
  onPointerMove: (pointerEvent: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (pointerEvent: ReactPointerEvent<HTMLElement>) => void
  onPointerCancel: () => void
}

const NOOP_HANDLERS: MonthDragHandlers = {
  onPointerDown: () => {},
  onPointerMove: () => {},
  onPointerUp: () => {},
  onPointerCancel: () => {},
}

export interface UseMonthDragResult<TData> {
  /** Which chip is being dragged and which day it is currently over, or `null` when idle. */
  dragState: MonthDragState | null
  /** Whether the pointer session just ended (or is active) crossed the drag threshold — a chip's click handler calls this to skip opening the editor after a drag. */
  wasDragged: () => boolean
  /** Builds the pointer handlers for one chip. */
  getChipHandlers: (event: CalendarEvent<TData>) => MonthDragHandlers
}

/** The `data-day` (see {@link formatDateInput}) of the day cell under a viewport point, if any. */
function dayKeyAt(x: number, y: number): string | null {
  const target = document.elementFromPoint(x, y)
  const cell = target instanceof Element ? target.closest<HTMLElement>("[data-day]") : null
  return cell?.dataset["day"] ?? null
}

/**
 * Drag-to-move for month-view chips.
 *
 * A pointerdown captures the pointer on the chip itself, so `pointermove`
 * and `pointerup` keep firing on it even once the cursor is over a
 * different cell — {@link dayKeyAt} then asks the DOM which day cell sits
 * under the pointer's viewport coordinates. Moving stays a no-op until the
 * pointer has travelled {@link DRAG_THRESHOLD_PX}, so an ordinary click
 * still reaches the chip's own click handler. Dropping on a different day
 * shifts both `start` and `end` by that many calendar days, keeping the
 * event's time of day.
 *
 * @param instance - Supplies `flags.move` and `updateEvent`.
 * @param daysByKey - Every visible day keyed by `formatDateInput`, so a
 *   `data-day` string resolves back to the exact `Date` shown in that cell.
 */
export function useMonthDrag<TData>(instance: CalendarInstance<TData>, daysByKey: ReadonlyMap<string, Date>): UseMonthDragResult<TData> {
  const [dragState, setDragState] = useState<MonthDragState | null>(null)
  const sessionRef = useRef<DragSession<TData> | null>(null)
  const draggedRef = useRef(false)

  const cancel = useCallback((): void => {
    sessionRef.current = null
    setDragState(null)
  }, [])

  // Escape aborts an in-progress drag without moving the event.
  useEffect(() => {
    if (!dragState) return
    const handleKeyDown = (keyboardEvent: KeyboardEvent): void => {
      if (keyboardEvent.key === "Escape") {
        draggedRef.current = false
        cancel()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [dragState, cancel])

  const getChipHandlers = useCallback(
    (event: CalendarEvent<TData>): MonthDragHandlers => {
      if (event.readOnly === true || !instance.flags.move) return NOOP_HANDLERS

      const onPointerDown = (pointerEvent: ReactPointerEvent<HTMLElement>): void => {
        if (pointerEvent.button !== 0) return
        pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId)
        draggedRef.current = false
        sessionRef.current = { event, dragging: false, startX: pointerEvent.clientX, startY: pointerEvent.clientY }
      }

      const onPointerMove = (pointerEvent: ReactPointerEvent<HTMLElement>): void => {
        const session = sessionRef.current
        if (!session || session.event.id !== event.id) return
        const distance = Math.hypot(pointerEvent.clientX - session.startX, pointerEvent.clientY - session.startY)
        if (!session.dragging && distance < DRAG_THRESHOLD_PX) return
        session.dragging = true
        draggedRef.current = true
        setDragState({ eventId: event.id, overDayKey: dayKeyAt(pointerEvent.clientX, pointerEvent.clientY) })
      }

      const onPointerUp = (pointerEvent: ReactPointerEvent<HTMLElement>): void => {
        const session = sessionRef.current
        cancel()
        if (!session || session.event.id !== event.id || !session.dragging) return
        const dayKey = dayKeyAt(pointerEvent.clientX, pointerEvent.clientY)
        const targetDay = dayKey !== null ? daysByKey.get(dayKey) : undefined
        if (!targetDay || isSameDay(targetDay, session.event.start)) return
        const deltaDays = differenceInCalendarDays(targetDay, session.event.start)
        void instance.updateEvent(session.event.id, {
          start: addDays(session.event.start, deltaDays),
          end: addDays(session.event.end, deltaDays),
        })
      }

      return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: cancel }
    },
    [instance, daysByKey, cancel],
  )

  const wasDragged = useCallback(() => draggedRef.current, [])

  return { dragState, wasDragged, getChipHandlers }
}
