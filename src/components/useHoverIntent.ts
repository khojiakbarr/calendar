import { useCallback, useEffect, useRef, useState } from "react"
import type { AnchorRect } from "./Popover"

/** What's hovered: the event data plus where its tooltip should anchor. */
export interface HoverTarget<T> {
  event: T
  anchor: AnchorRect
}

/** What {@link useHoverIntent} exposes. */
export interface HoverIntent<T> {
  /** The hovered target once the delay has elapsed without a {@link hide}; else `null`. */
  target: HoverTarget<T> | null
  /**
   * Call on pointer enter; `target` appears after the configured delay. Pass a
   * function to read the target when it appears rather than now — a chip
   * that grows under the pointer is measured at its grown size.
   */
  show(target: HoverTarget<T> | (() => HoverTarget<T>)): void
  /** Call on pointer leave; cancels a pending show and clears the current target immediately. */
  hide(): void
}

/**
 * Delays showing a hover target so a pointer passing over many events —
 * dragging across a week, skimming a month grid — doesn't flash a tooltip
 * per event it crosses; only a genuine pause triggers one.
 *
 * Generic over the event type so callers can hand it a `CalendarEvent<T>`
 * without this hook needing to know the domain's data shape.
 *
 * @param delayMs - How long the pointer must stay before `target` is set.
 */
export function useHoverIntent<T>(delayMs = 400): HoverIntent<T> {
  const [target, setTarget] = useState<HoverTarget<T> | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPendingTimer = useCallback(() => {
    if (timerRef.current === null) return
    clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const show = useCallback(
    (next: HoverTarget<T> | (() => HoverTarget<T>)) => {
      clearPendingTimer()
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        setTarget(typeof next === "function" ? next() : next)
      }, delayMs)
    },
    [clearPendingTimer, delayMs],
  )

  const hide = useCallback(() => {
    clearPendingTimer()
    setTarget(null)
  }, [clearPendingTimer])

  // Cancel an in-flight timer if the consuming component unmounts mid-delay.
  useEffect(() => clearPendingTimer, [clearPendingTimer])

  return { target, show, hide }
}
