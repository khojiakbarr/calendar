import { useEffect, useRef, type ReactNode, useContext } from "react"
import { createPortal } from "react-dom"
import { CalendarThemeContext } from "./themeContext"
import { classNames } from "../core/classNames"
import { useSlotClass } from "./classesContext"
import { usePlacement } from "./usePlacement"
import "../styles/popover.css"

/** A floating element's trigger, in viewport coordinates (as from `getBoundingClientRect`). */
export interface AnchorRect {
  top: number
  left: number
  width: number
  height: number
}

export interface PopoverProps {
  /** Where to float near; `null` centres the popover in the viewport. */
  anchor: AnchorRect | null
  /** Called on Escape and on a pointerdown outside the popover. */
  onClose: () => void
  /** Id of the element that labels the popover, wired to `aria-labelledby`. */
  labelledBy?: string
  role?: string
  className?: string
  children: ReactNode
  /** Fixed width in px; omit to let content and the CSS `min-width` decide. */
  width?: number
}

/**
 * A floating card anchored to a rectangle on screen — the event editor and
 * any other click-triggered overlay render inside one of these.
 *
 * Portaled to `document.body` so a scrolling, `overflow`-clipped grid can
 * never cut it off; positioned `fixed` via {@link usePlacement} and always
 * kept fully inside the viewport. Acts as a light focus trap: the first
 * focusable child is focused on open, focus returns to whatever held it
 * before the popover appeared, and Escape or a pointerdown outside closes it.
 *
 * @example
 * {anchor ? (
 *   <Popover anchor={anchor} onClose={close} labelledBy={titleId}>
 *     <EditorForm />
 *   </Popover>
 * ) : null}
 */
export function Popover({ anchor, onClose, labelledBy, role = "dialog", className, children, width }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const position = usePlacement(anchor, ref)

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose()
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  useEffect(() => {
    // Captured once per mount, not per render: the popover gets a fresh DOM
    // subtree each time it opens, and re-running this on unrelated
    // re-renders would steal focus back from whatever the user moved to.
    const previouslyFocused = document.activeElement
    const focusable = ref.current?.querySelector<HTMLElement>(
      'input, textarea, select, button, a[href], [tabindex]:not([tabindex="-1"])',
    )
    focusable?.focus()
    return () => {
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const theme = useContext(CalendarThemeContext)
  const slotClass = useSlotClass("popover")
  return createPortal(
    // The wrapper is a token carrier only: `cal-floating` makes it draw nothing.
    <div className="cal-root cal-floating" data-theme={theme}>
    <div
      ref={ref}
      role={role}
      aria-labelledby={labelledBy}
      className={classNames("cal-popover", slotClass, className)}
      style={{ position: "fixed", top: position.top, left: position.left, width }}
    >
      {children}
    </div>
    </div>,
    document.body,
  )
}
