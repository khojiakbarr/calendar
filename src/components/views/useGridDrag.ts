import { useCallback, useEffect, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent, RefObject } from "react"
import { addMinutes, minutesOfDay, withMinutesOfDay } from "../../core/date"
import type { CalendarInstance } from "../../instance"
import type { CalendarEvent, EventDraft } from "../../types"
import type { AnchorRect } from "./anchor"
import { ghostFor, measureGrid, minuteAt, rawMinuteAt, slotRect, type DragSession, type GridGesture, type GridGhost } from "./useGridPointer"

export type { GridGesture, GridGhost } from "./useGridPointer"

/** How far the pointer must travel before a press becomes a drag rather than a click. */
const GESTURE_THRESHOLD_PX = 4

/** Pointer props to spread onto the grid body. */
export interface GridDragHandlers {
  onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void
  onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void
  onPointerUp(event: ReactPointerEvent<HTMLDivElement>): void
  onPointerCancel(event: ReactPointerEvent<HTMLDivElement>): void
}

/** What {@link useGridDrag} needs from its host view. */
export interface UseGridDragOptions<T> {
  instance: CalendarInstance<T>
  /** The `.cal-timegrid-body` element; gestures are measured and captured against it. */
  bodyRef: RefObject<HTMLDivElement | null>
  /** Builds the draft a finished create gesture hands over — the view owns defaults like the resource. */
  buildDraft(column: number, startMinutes: number, endMinutes: number): EventDraft<T>
  onCreateRequest(draft: EventDraft<T>, anchor: AnchorRect): void
}

/** State and handlers a time grid needs to draw and run drag gestures. */
export interface GridDrag<T> {
  ghost: GridGhost<T> | null
  dragging: boolean
  handlers: GridDragHandlers
}

/** Which gesture a press on `target` starts. */
function gestureAt(target: HTMLElement, chip: HTMLElement | null): GridGesture {
  if (!chip) return "create"
  return target.closest(".cal-event-resize") ? "resize" : "move"
}

/** Whether the calendar currently offers `gesture` — feature flag first, then the event's own veto. */
function isGestureAllowed<T>(instance: CalendarInstance<T>, gesture: GridGesture, event: CalendarEvent<T> | null): boolean {
  if (gesture === "create") return instance.flags.create
  if (!event || event.readOnly === true) return false
  return gesture === "move" ? instance.flags.move : instance.flags.resize
}

/** How long `event` runs, in minutes. */
function durationOf<T>(event: CalendarEvent<T>): number {
  return (event.end.getTime() - event.start.getTime()) / 60_000
}

/**
 * Routes the rest of the gesture to `body`.
 *
 * WHY: without capture, the pointer leaving the body — over the gutter, past
 * the window edge — stops delivering moves and the drag freezes half-done.
 * Capture also means the final `pointerup` always arrives here, so the hook
 * needs no window-level listeners to register and tear down.
 */
function capturePointer(body: HTMLElement, pointerId: number): void {
  // jsdom and pre-pointer-events browsers have no capture at all; the drag still
  // works while the pointer stays over the grid, so degrade rather than throw.
  if (typeof body.setPointerCapture === "function") body.setPointerCapture(pointerId)
}

/**
 * Pointer gestures for the time grid: drag empty space to create, drag a chip
 * to move it (across days in week view), drag its bottom edge to resize.
 *
 * All three run off one captured pointer on the grid body rather than per-chip
 * listeners, because a move can leave the chip it started on and a create
 * sweeps space that has no element of its own.
 *
 * Nothing is committed until `pointerup`, and Escape drops the session, so a
 * gesture the user changes their mind about costs no server round trip.
 *
 * @param options - The calendar instance, the body element, and how to turn a
 *   finished create gesture into a draft.
 * @returns The ghost to draw, whether a drag is in flight, and the body's pointer props.
 *
 * @example
 * const { ghost, dragging, handlers } = useGridDrag({ instance, bodyRef, buildDraft, onCreateRequest })
 */
export function useGridDrag<T>(options: UseGridDragOptions<T>): GridDrag<T> {
  const { instance, bodyRef, buildDraft, onCreateRequest } = options
  const sessionRef = useRef<DragSession<T> | null>(null)
  const ghostRef = useRef<GridGhost<T> | null>(null)
  const [ghost, setGhostState] = useState<GridGhost<T> | null>(null)

  // The ref mirrors the state because `pointerup` has to read the final ghost
  // synchronously — the render that would deliver it has not happened yet.
  const setGhost = useCallback((next: GridGhost<T> | null): void => {
    ghostRef.current = next
    setGhostState(next)
  }, [])

  const endSession = useCallback((): void => {
    const body = bodyRef.current
    const session = sessionRef.current
    if (body && session && body.hasPointerCapture?.(session.pointerId)) body.releasePointerCapture(session.pointerId)
    sessionRef.current = null
    setGhost(null)
  }, [bodyRef, setGhost])

  // Escape is only meaningful once something is being dragged, so the listener
  // exists only for the length of the gesture.
  useEffect(() => {
    if (!ghost) return
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") endSession()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [ghost, endSession])

  const commit = (session: DragSession<T>, final: GridGhost<T>): void => {
    const day = instance.days[final.column]
    if (!day) return
    if (final.gesture === "create") {
      const anchor = slotRect(session.metrics, final.column, final.startMinutes, final.endMinutes)
      onCreateRequest(buildDraft(final.column, final.startMinutes, final.endMinutes), anchor)
      return
    }
    if (!final.event) return
    if (final.gesture === "resize") {
      void instance.updateEvent(final.event.id, { end: withMinutesOfDay(day, final.endMinutes) })
      return
    }
    const start = withMinutesOfDay(day, final.startMinutes)
    void instance.updateEvent(final.event.id, { start, end: addMinutes(start, final.endMinutes - final.startMinutes) })
  }

  const handlePointerDown = (pointer: ReactPointerEvent<HTMLDivElement>): void => {
    if (pointer.button !== 0) return // secondary buttons open menus, they do not drag
    const body = bodyRef.current
    const target = pointer.target instanceof HTMLElement ? pointer.target : null
    const column = target?.closest<HTMLElement>(".cal-timegrid-col") ?? null
    if (!body || !target || !column) return
    const columnIndex = Number(column.dataset.column)
    if (!Number.isInteger(columnIndex)) return

    const chip = target.closest<HTMLElement>("[data-event-id]")
    const gesture = gestureAt(target, chip)
    const event = chip ? (instance.events.find((candidate) => candidate.id === chip.dataset.eventId) ?? null) : null
    if (!isGestureAllowed(instance, gesture, event)) return

    const metrics = measureGrid(body, column, columnIndex, instance.days.length, instance.settings)
    const startMinutes = event ? minutesOfDay(event.start) : 0
    sessionRef.current = {
      gesture,
      pointerId: pointer.pointerId,
      startX: pointer.clientX,
      startY: pointer.clientY,
      metrics,
      column: columnIndex,
      anchorMinute: minuteAt(metrics, pointer.clientY),
      anchorRawMinute: rawMinuteAt(metrics, pointer.clientY),
      event,
      startMinutes,
      endMinutes: event ? startMinutes + durationOf(event) : 0,
    }
    capturePointer(body, pointer.pointerId)
  }

  const handlePointerMove = (pointer: ReactPointerEvent<HTMLDivElement>): void => {
    const session = sessionRef.current
    if (!session || pointer.pointerId !== session.pointerId) return
    const movedFar =
      Math.abs(pointer.clientX - session.startX) >= GESTURE_THRESHOLD_PX ||
      Math.abs(pointer.clientY - session.startY) >= GESTURE_THRESHOLD_PX
    if (!ghostRef.current && !movedFar) return // still within click tolerance
    setGhost(ghostFor(session, pointer.clientX, pointer.clientY))
  }

  const handlePointerUp = (pointer: ReactPointerEvent<HTMLDivElement>): void => {
    const session = sessionRef.current
    const final = ghostRef.current
    if (!session || pointer.pointerId !== session.pointerId) return
    endSession()
    if (final) commit(session, final) // no ghost means the press never became a drag
  }

  return {
    ghost,
    dragging: ghost !== null,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: endSession,
    },
  }
}
