import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { CalendarEvent, CalendarView, EventSource } from "../../types"
import { useCalendar } from "../../useCalendar"
import { Calendar } from "../Calendar"

const NOW = new Date(2031, 4, 14, 8, 0)
/** Six meetings at 14:00 on the 14th: more than a week's column can show side by side. */
const SIX: CalendarEvent[] = Array.from({ length: 6 }, (_, index) => ({
  id: `m${index}`,
  name: `Meeting ${index + 1}`,
  start: new Date(2031, 4, 14, 14, 0),
  end: new Date(2031, 4, 14, 15, 0),
}))
const SOURCE: EventSource = { load: async () => SIX }
const clock = { now: () => NOW }

function Grid({ view }: { view: CalendarView }) {
  const instance = useCalendar({ id: `overflow-${view}`, source: SOURCE, now: clock.now, initialView: view })
  return (
    <>
      <Calendar instance={instance} />
      <output data-testid="view">{instance.view}</output>
    </>
  )
}

describe("a crowded hour on the time grid", () => {
  it("draws two meetings in a week's column and «+4» for the rest, which opens the day", async () => {
    const { container } = render(<Grid view="week" />)
    await screen.findByText("Meeting 1")
    expect(container.querySelectorAll(".cal-event-timed")).toHaveLength(2)
    const more = screen.getByRole("button", { name: "+4 more" })
    fireEvent.click(more)
    expect(screen.getByTestId("view")).toHaveTextContent("day")
  })

  it("draws all six side by side in the roomier day view", async () => {
    const { container } = render(<Grid view="day" />)
    await screen.findByText("Meeting 1")
    expect(container.querySelectorAll(".cal-event-timed")).toHaveLength(6)
    expect(screen.queryByRole("button", { name: /more/ })).toBeNull()
  })
})
