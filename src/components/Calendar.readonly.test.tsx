import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { CalendarEvent, CalendarView, EventSource } from "../types"
import { useCalendar } from "../useCalendar"
import { Calendar } from "./Calendar"
import { defaultLabels } from "./labels"

const NOW = new Date(2031, 4, 14, 10, 0)
const EVENTS: CalendarEvent[] = [{ id: "a", name: "Звонок", start: new Date(2031, 4, 14, 11, 0), end: new Date(2031, 4, 14, 12, 0) }]
/** Only `load`: what the home calendar hands the library. */
const READ_ONLY: EventSource = { load: async () => EVENTS }
const clock = { now: () => NOW }

function ReadOnly({ view }: { view: CalendarView }) {
  const instance = useCalendar({ id: `ro-${view}`, source: READ_ONLY, now: clock.now, initialView: view })
  return <Calendar instance={instance} />
}

describe("a source with only load", () => {
  it("offers no new-event button", async () => {
    render(<ReadOnly view="week" />)
    await screen.findByText("Звонок")
    expect(screen.queryByRole("button", { name: defaultLabels.newEvent })).toBeNull()
  })

  it("draws no resize grip and opens nothing on a click", async () => {
    const { container } = render(<ReadOnly view="week" />)
    await screen.findByText("Звонок")
    expect(container.querySelector(".cal-event-resize")).toBeNull()
    fireEvent.click(screen.getByText("Звонок"))
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("opens nothing on a double-click in an empty month cell", async () => {
    const { container } = render(<ReadOnly view="month" />)
    await screen.findByText("Звонок")
    const cell = container.querySelector('[data-day="2031-05-20"]')
    if (!cell) throw new Error("no cell")
    fireEvent.doubleClick(cell)
    expect(screen.queryByRole("dialog")).toBeNull()
  })
})
