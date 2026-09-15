import { useEffect } from "react"
import type { RefObject } from "react"

/** Every element `Tab` should be able to reach inside a trapped container. */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** The subset of {@link FOCUSABLE_SELECTOR} worth preferring for the initial focus. */
const FORM_FIELD_SELECTOR = "input:not([disabled]), textarea:not([disabled]), select:not([disabled])"

/** Every focusable descendant of `container`, in DOM (tab) order. */
function focusablesIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

/**
 * Where opening the trap should land focus.
 *
 * Prefers the first form field over, say, a leading close-icon button: React's
 * `autoFocus` prop has no DOM trace to detect (it is applied imperatively,
 * not as an attribute), so this is how "autofocus an input if present" is
 * actually implemented — by field type rather than by inspecting the DOM for
 * a marker that was never written to it.
 */
function initialFocusTarget(container: HTMLElement): HTMLElement | undefined {
  const elements = focusablesIn(container)
  return elements.find((element) => element.matches(FORM_FIELD_SELECTOR)) ?? elements[0]
}

/**
 * A standard modal focus trap: focuses the first (preferably form-field)
 * element inside `ref` when `active` turns on, keeps `Tab`/`Shift+Tab` cycling
 * within it, calls `onClose` on `Escape`, and restores focus to whatever held
 * it beforehand once `active` turns off again.
 *
 * Split out of {@link Dialog} so that component stays markup-and-wiring only,
 * and because the trap is self-contained enough to reason about (and test)
 * apart from portals, placement or presentation.
 *
 * @param ref - The dialog card to trap focus inside.
 * @param active - Whether the trap is currently engaged (the dialog is open).
 * @param onClose - Called once per `Escape` press while active.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!active) return

    // Captured once per activation, not per render — see Popover's identical
    // comment: re-running this on an unrelated re-render would steal focus
    // back from wherever the user has since moved it.
    const previouslyFocused = document.activeElement
    const container = ref.current
    initialFocusTarget(container ?? document.body)?.focus()

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose()
        return
      }
      if (event.key !== "Tab" || !container) return
      const elements = focusablesIn(container)
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
}
