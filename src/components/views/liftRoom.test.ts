import { describe, expect, it } from "vitest"
import { LIFT_MAX_PX, prepareLift } from "./liftRoom"

/** A chip inside a row, each at the given left and width (px), as `getBoundingClientRect` would report them. */
function chipIn(row: { left: number; width: number }, chip: { left: number; width: number }, className = "cal-allday-pill"): HTMLElement {
  const rowEl = document.createElement("div")
  const chipEl = document.createElement("div")
  chipEl.className = className
  rowEl.append(chipEl)
  const rect = (box: { left: number; width: number }) => () => ({ left: box.left, right: box.left + box.width, width: box.width, top: 0, bottom: 20, height: 20, x: box.left, y: 0, toJSON: () => ({}) })
  rowEl.getBoundingClientRect = rect(row)
  chipEl.getBoundingClientRect = rect(chip)
  return chipEl
}

describe("where a lifted chip grows", () => {
  it("grows rightwards where the row has room for its widest", () => {
    const chip = chipIn({ left: 0, width: 1000 }, { left: 100, width: 120 })
    prepareLift(chip)
    expect(chip.dataset["lift"]).toBe("end")
    expect(chip.style.getPropertyValue("--cal-lift-room")).toBe(`${1000 - 100 - 4}px`)
  })

  it("grows leftwards near the row's right edge — Sunday's — and no further than the row's left", () => {
    const chip = chipIn({ left: 0, width: 1000 }, { left: 860, width: 140 }, "cal-month-event")
    prepareLift(chip)
    expect(chip.dataset["lift"]).toBe("start")
    expect(chip.style.getPropertyValue("--cal-lift-room")).toBe(`${1000 - 4}px`)
  })

  it("never caps a chip below its own width, and leaves a time-grid chip alone", () => {
    const narrow = chipIn({ left: 0, width: 150 }, { left: 0, width: 150 })
    prepareLift(narrow)
    expect(Number.parseInt(narrow.style.getPropertyValue("--cal-lift-room"), 10)).toBeGreaterThanOrEqual(150)
    expect(LIFT_MAX_PX).toBe(280)

    const timed = chipIn({ left: 0, width: 1000 }, { left: 900, width: 100 }, "cal-event-timed")
    prepareLift(timed)
    expect(timed.dataset["lift"]).toBeUndefined()
  })
})
