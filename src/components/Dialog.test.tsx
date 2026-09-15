import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Dialog } from "./Dialog"

/**
 * Stubs `window.matchMedia` so `presentation="auto"` resolves deterministically
 * instead of always falling back to "modal" (jsdom implements no `matchMedia`
 * at all — see `useMediaQuery`).
 */
function mockMatchMedia(matches: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

describe("Dialog", () => {
  afterEach(() => {
    // @ts-expect-error -- undoing the test-only stub above; the property does not exist otherwise
    delete window.matchMedia
    document.body.style.overflow = ""
  })

  it("renders its children in a portal, outside the render container", () => {
    const { container } = render(
      <Dialog onClose={vi.fn()}>
        <input aria-label="name" />
      </Dialog>,
    )

    expect(container.querySelector(".cal-dialog")).toBeNull()
    expect(document.body.querySelector(".cal-dialog")).not.toBeNull()
    expect(screen.getByLabelText("name")).toBeInTheDocument()
  })

  it("renders nothing when open is false", () => {
    render(
      <Dialog open={false} onClose={vi.fn()}>
        <input aria-label="name" />
      </Dialog>,
    )

    expect(document.body.querySelector(".cal-dialog")).toBeNull()
  })

  it("calls onClose when Escape is pressed", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Dialog onClose={onClose}>
        <input aria-label="name" />
      </Dialog>,
    )

    await user.keyboard("{Escape}")

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose on a pointerdown on the backdrop", () => {
    const onClose = vi.fn()
    render(
      <Dialog onClose={onClose}>
        <input aria-label="name" />
      </Dialog>,
    )

    const backdrop = document.body.querySelector(".cal-dialog-backdrop")
    fireEvent.pointerDown(backdrop as Element)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("does not call onClose on a pointerdown inside the card", () => {
    const onClose = vi.fn()
    render(
      <Dialog onClose={onClose}>
        <input aria-label="name" />
      </Dialog>,
    )

    fireEvent.pointerDown(screen.getByLabelText("name"))

    expect(onClose).not.toHaveBeenCalled()
  })

  it("focuses the first form field on open, ahead of an earlier button", () => {
    render(
      <Dialog onClose={vi.fn()}>
        <button type="button">Close</button>
        <input aria-label="name" />
      </Dialog>,
    )

    expect(screen.getByLabelText("name")).toHaveFocus()
  })

  it("wraps Tab from the last focusable back to the first", async () => {
    const user = userEvent.setup()
    render(
      <Dialog onClose={vi.fn()}>
        <input aria-label="name" />
        <button type="button">Save</button>
      </Dialog>,
    )

    screen.getByRole("button", { name: "Save" }).focus()
    await user.tab()

    expect(screen.getByLabelText("name")).toHaveFocus()
  })

  it("wraps Shift+Tab from the first focusable back to the last", async () => {
    const user = userEvent.setup()
    render(
      <Dialog onClose={vi.fn()}>
        <input aria-label="name" />
        <button type="button">Save</button>
      </Dialog>,
    )

    expect(screen.getByLabelText("name")).toHaveFocus() // the opening focus
    await user.tab({ shift: true })

    expect(screen.getByRole("button", { name: "Save" })).toHaveFocus()
  })

  it("restores focus to the previously focused element on unmount", () => {
    const trigger = document.createElement("button")
    document.body.appendChild(trigger)
    trigger.focus()

    const { unmount } = render(
      <Dialog onClose={vi.fn()}>
        <input aria-label="name" />
      </Dialog>,
    )
    expect(screen.getByLabelText("name")).toHaveFocus()

    unmount()

    expect(trigger).toHaveFocus()
    trigger.remove()
  })

  it("locks body scroll while open and restores it once closed", () => {
    const { unmount } = render(
      <Dialog onClose={vi.fn()}>
        <input aria-label="name" />
      </Dialog>,
    )

    expect(document.body.style.overflow).toBe("hidden")

    unmount()

    expect(document.body.style.overflow).toBe("")
  })

  it("renders a centred modal card for presentation='modal'", () => {
    render(
      <Dialog presentation="modal" onClose={vi.fn()}>
        <input aria-label="name" />
      </Dialog>,
    )

    expect(document.body.querySelector(".cal-dialog-modal")).not.toBeNull()
    expect(document.body.querySelector(".cal-dialog-sheet")).toBeNull()
    expect(document.body.querySelector(".cal-dialog-handle")).toBeNull()
  })

  it("renders a bottom sheet with a drag handle for presentation='sheet'", () => {
    render(
      <Dialog presentation="sheet" onClose={vi.fn()}>
        <input aria-label="name" />
      </Dialog>,
    )

    expect(document.body.querySelector(".cal-dialog-sheet")).not.toBeNull()
    expect(document.body.querySelector(".cal-dialog-handle")).not.toBeNull()
  })

  it("resolves 'auto' to a sheet once the narrow-viewport query matches", () => {
    mockMatchMedia(true)
    render(
      <Dialog onClose={vi.fn()}>
        <input aria-label="name" />
      </Dialog>,
    )

    expect(document.body.querySelector(".cal-dialog-sheet")).not.toBeNull()
  })

  it("resolves 'auto' to a modal when the narrow-viewport query does not match", () => {
    mockMatchMedia(false)
    render(
      <Dialog onClose={vi.fn()}>
        <input aria-label="name" />
      </Dialog>,
    )

    expect(document.body.querySelector(".cal-dialog-modal")).not.toBeNull()
  })

  it("falls back to 'modal' for 'auto' when matchMedia is unavailable", () => {
    render(
      <Dialog onClose={vi.fn()}>
        <input aria-label="name" />
      </Dialog>,
    )

    expect(document.body.querySelector(".cal-dialog-modal")).not.toBeNull()
  })
})
