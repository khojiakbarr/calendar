import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { CalendarEvent, EventSource } from "../types"
import { useCalendar } from "../useCalendar"
import { Calendar } from "./Calendar"

const NOW = new Date(2031, 4, 14, 10, 0)
const day = (date: number) => new Date(2031, 4, date)

/** One record's three dates and an unrelated event, as the home calendar draws a project step. */
const EVENTS: CalendarEvent[] = [
  { id: "plan", name: "Закупка · план", start: day(5), end: day(9), allDay: true, appearance: "plan", groupId: "step-1" },
  { id: "over", name: "Закупка · просрочка", start: day(9), end: day(12), allDay: true, appearance: "overrun", groupId: "step-1" },
  { id: "due", name: "Закупка · срок", start: day(8), end: day(9), allDay: true, marker: "tick", groupId: "step-1" },
  { id: "paid", name: "Оплата", start: day(20), end: day(21), allDay: true, marker: "dot", tone: "success", className: "x-paid" },
]
const SOURCE: EventSource = { load: async () => EVENTS }
const clock = { now: () => NOW }

function Month(props: { onEventClick?: (event: CalendarEvent) => void }) {
  const instance = useCalendar({ id: "looks", source: SOURCE, now: clock.now, initialView: "month" })
  return <Calendar instance={instance} {...props} />
}

function chip(container: HTMLElement, id: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(`[data-event-id="${id}"]`)
  if (!element) throw new Error(`No chip for ${id}`)
  return element
}

describe("event looks on the month grid", () => {
  it("draws each look, marker, tone and the host's class", async () => {
    const { container } = render(<Month />)
    await screen.findByText("Оплата")
    expect(chip(container, "plan").className).toContain("cal-look-plan")
    expect(chip(container, "over").className).toContain("cal-look-overrun")
    expect(chip(container, "over").style.getPropertyValue("--cal-event-color")).toBe("var(--cal-danger)")
    expect(chip(container, "due").className).toContain("cal-marker-tick")
    expect(chip(container, "paid").className).toContain("cal-marker-dot")
    expect(chip(container, "paid").className).toContain("x-paid")
    expect(chip(container, "paid").style.getPropertyValue("--cal-event-color")).toBe("var(--cal-success)")
    expect(chip(container, "due").dataset.group).toBe("step-1")
  })
})
