import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Popover, type AnchorRect } from "./Popover"

describe("Popover", () => {
  it("renders its children in a portal, outside the render container", () => {
    const { container } = render(
      <Popover anchor={null} onClose={vi.fn()}>
        <input aria-label="name" />
      </Popover>,
    )

    expect(container.querySelector(".cal-popover")).toBeNull()
    expect(document.body.querySelector(".cal-popover")).not.toBeNull()
    expect(screen.getByLabelText("name")).toBeInTheDocument()
  })

  it("calls onClose when Escape is pressed", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Popover anchor={null} onClose={onClose}>
        <input aria-label="name" />
      </Popover>,
    )

    await user.keyboard("{Escape}")

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose on a pointerdown outside the popover", () => {
    const onClose = vi.fn()
    render(
      <Popover anchor={null} onClose={onClose}>
        <input aria-label="name" />
      </Popover>,
    )

    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("does not call onClose on a pointerdown inside the popover", () => {
    const onClose = vi.fn()
    render(
      <Popover anchor={null} onClose={onClose}>
        <input aria-label="name" />
      </Popover>,
    )

    screen.getByLabelText("name").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))

    expect(onClose).not.toHaveBeenCalled()
  })

  it("focuses the first focusable child on open", () => {
    render(
      <Popover anchor={null} onClose={vi.fn()}>
        <input aria-label="name" />
        <button type="button">Save</button>
      </Popover>,
    )

    expect(screen.getByLabelText("name")).toHaveFocus()
  })

  it("restores focus to the previously focused element on unmount", () => {
    const trigger = document.createElement("button")
    document.body.appendChild(trigger)
    trigger.focus()

    const { unmount } = render(
      <Popover anchor={null} onClose={vi.fn()}>
        <input aria-label="name" />
      </Popover>,
    )
    expect(screen.getByLabelText("name")).toHaveFocus()

    unmount()

    expect(trigger).toHaveFocus()
    trigger.remove()
  })

  it("centres itself in the viewport when anchor is null", () => {
    render(
      <Popover anchor={null} onClose={vi.fn()}>
        <input aria-label="name" />
      </Popover>,
    )

    const popover = document.body.querySelector<HTMLElement>(".cal-popover")
    // jsdom reports a 0x0 bounding rect for every element, so the centred
    // position collapses to exactly half the viewport on both axes.
    expect(popover?.style.left).toBe(`${window.innerWidth / 2}px`)
    expect(popover?.style.top).toBe(`${window.innerHeight / 2}px`)
  })

  it("places itself relative to a given anchor rather than centring", () => {
    const anchor: AnchorRect = { top: 50, left: 50, width: 20, height: 20 }
    render(
      <Popover anchor={anchor} onClose={vi.fn()}>
        <input aria-label="name" />
      </Popover>,
    )

    const popover = document.body.querySelector<HTMLElement>(".cal-popover")
    // To the right of the anchor: anchor.left + anchor.width + gap(8).
    expect(popover?.style.left).toBe("78px")
    expect(popover?.style.top).toBe("50px")
  })
})
