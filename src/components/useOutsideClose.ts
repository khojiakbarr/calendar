import { useEffect } from "react"
import type { RefObject } from "react"

/**
 * Closes a popover when the user clicks outside it or presses Escape.
 *
 * Mirrors the data-table `HeaderMenu` dismissal pattern (a pointerdown
 * outside the ref, or Escape, closes it) without depending on that package.
 * Every popover in this library — the toolbar's settings menu, and later the
 * event editor and tooltips — needs the same two listeners, so this is the
 * one place that logic lives instead of being copied into each one.
 *
 * @param ref - The popover element. A pointerdown outside it triggers `onClose`.
 * @param onClose - Called once per dismissal (outside click or Escape).
 * @param enabled - Skip wiring the listeners while the popover is closed, so
 *   a closed popover costs nothing. Default `true`.
 */
export function useOutsideClose(ref: RefObject<HTMLElement | null>, onClose: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return

    const onPointerDown = (event: PointerEvent) => {
      // event.target is typed as the generic EventTarget; Node is what
      // Element.contains expects, and every real pointer event target is one.
      if (!ref.current?.contains(event.target as Node)) onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [ref, onClose, enabled])
}
