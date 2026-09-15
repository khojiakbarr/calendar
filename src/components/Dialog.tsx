import { useContext, useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { classNames } from "../core/classNames"
import { useSlotClass } from "./classesContext"
import { CalendarThemeContext } from "./themeContext"
import { useFocusTrap } from "./useFocusTrap"
import { useMediaQuery } from "./useMediaQuery"
import "../styles/dialog.css"

/** Below this viewport width, `presentation="auto"` renders a bottom sheet instead of a centred modal. */
export const SHEET_BREAKPOINT_QUERY = "(max-width: 640px)"

export type DialogPresentation = "modal" | "sheet" | "auto"

export interface DialogProps {
  /** Whether the dialog is rendered at all. Default `true` — most callers mount `Dialog` only while open, the same way `Popover` is used. */
  open?: boolean
  /**
   * `"modal"` centres a card in the viewport; `"sheet"` docks it to the
   * bottom edge; `"auto"` (default) picks `"sheet"` under
   * {@link SHEET_BREAKPOINT_QUERY} and `"modal"` otherwise.
   */
  presentation?: DialogPresentation
  /** Id of the element that labels the dialog, wired to `aria-labelledby`. */
  labelledBy?: string
  /** Called on Escape, and on a pointerdown that lands on the backdrop itself (not the card). */
  onClose: () => void
  children: ReactNode
  className?: string
}

/**
 * The calendar's blocking overlay: a centred modal on a wide viewport, a
 * bottom sheet on a narrow one. What {@link EventEditor} opens on a click,
 * replacing the old anchored {@link Popover} the editor used to render in —
 * a modal/sheet is what "click an event" is expected to open; a card
 * hovering next to the chip is not.
 *
 * Portaled to `document.body` inside the same token-carrying wrapper every
 * floating layer uses (see {@link CalendarThemeContext}), so it reaches full
 * viewport size and the calendar's own dark/light theme regardless of where
 * `<Dialog>` is mounted in the tree.
 *
 * Behaviour: `Escape` and a backdrop click both close it; focus is trapped
 * inside the card (`Tab`/`Shift+Tab` cycle, the first form field — or else
 * the first focusable element — is focused on open, and focus returns to
 * whatever held it beforehand on close); the page behind stops scrolling
 * while it is open.
 *
 * @example
 * {open ? (
 *   <Dialog presentation="auto" onClose={close} labelledBy={titleId}>
 *     <EditorForm />
 *   </Dialog>
 * ) : null}
 */
export function Dialog({ open = true, presentation = "auto", labelledBy, onClose, children, className }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isNarrowViewport = useMediaQuery(SHEET_BREAKPOINT_QUERY)
  const isSheet = presentation === "sheet" || (presentation === "auto" && isNarrowViewport)

  useFocusTrap(ref, open, onClose)

  useEffect(() => {
    if (!open) return
    // A dialog is modal in intent, not just in name: the page behind it
    // should not scroll while it is up, on either presentation.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  const theme = useContext(CalendarThemeContext)
  const slotClass = useSlotClass("dialog")

  if (!open) return null

  // Closes only for a press that both starts and ends on the backdrop
  // itself — `currentTarget` is the backdrop, `target` is whatever was
  // actually under the pointer, which is the card for any press inside it.
  function handleBackdropPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    if (event.target === event.currentTarget) onClose()
  }

  return createPortal(
    // The wrapper is a token carrier only: `cal-floating` makes it draw nothing.
    <div className="cal-root cal-floating" data-theme={theme}>
      <div className="cal-dialog-backdrop" onPointerDown={handleBackdropPointerDown}>
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          className={classNames("cal-dialog", isSheet ? "cal-dialog-sheet" : "cal-dialog-modal", slotClass, className)}
        >
          {isSheet ? <div className="cal-dialog-handle" aria-hidden="true" /> : null}
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
