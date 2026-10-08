import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { CalendarInstance } from "../../instance"
import type { CalendarEvent } from "../../types"
import { defaultLabels } from "../labels"
import { AgendaView } from "./AgendaView"

const day1 = new Date(2022, 2, 1)
const day2 = new Date(2022, 2, 2)
const day3 = new Date(2022, 2, 3)

/** A minimal fake `CalendarInstance`, built by hand so this test never depends on `useCalendar`. */
function createInstance(overrides: Partial<CalendarInstance<unknown>> = {}): CalendarInstance<unknown> {
  const date = day1
  return {
    id: "cal",
    date,
    view: "agenda",
    range: { start: date, end: date },
    days: [date],
    events: [] as CalendarEvent<unknown>[],
    resources: [],
    hiddenResourceIds: [],
    filterText: "",
    showWeekends: true,
    status: "idle",
    error: null,
    pendingIds: new Set(),
    flags: { create: true, move: true, resize: true, edit: true, remove: true },
    settings: { weekStartsOn: 1, locale: "en-US", dayStartHour: 0, dayEndHour: 24, snapMinutes: 15, defaultEventMinutes: 60, now: () => new Date() },
    isCustomised: false,
    setDate: vi.fn(),
    setView: vi.fn(),
    goToday: vi.fn(),
    goNext: vi.fn(),
    goPrevious: vi.fn(),
    setFilterText: vi.fn(),
    setResourceHidden: vi.fn(),
    setShowWeekends: vi.fn(),
    resetPreferences: vi.fn(),
    reload: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    removeEvent: vi.fn(),
    resourceOf: vi.fn(),
    colorOf: vi.fn(() => "#3b82f6"),
    ...overrides,
  }
}

/** Finds the `.cal-agenda-day` block whose big day number reads `dayOfMonth`. */
function findDayBlock(dayOfMonth: number): HTMLElement {
  const numberEl = screen.getByText(String(dayOfMonth), { selector: ".cal-agenda-day-number" })
  const block = numberEl.closest(".cal-agenda-day")
  if (!(block instanceof HTMLElement)) throw new Error(`no .cal-agenda-day block for day ${dayOfMonth}`)
  return block
}

describe("AgendaView", () => {
  it("groups an event under its day and skips days without events", () => {
    const timed: CalendarEvent = { id: "e1", name: "Standup", start: new Date(2022, 2, 1, 9, 0), end: new Date(2022, 2, 1, 9, 30) }
    const instance = createInstance({ days: [day1, day2, day3], events: [timed] })

    render(<AgendaView instance={instance} labels={defaultLabels} onEventOpen={vi.fn()} />)

    expect(screen.getByText("Standup")).toBeInTheDocument()
    expect(document.querySelectorAll(".cal-agenda-day")).toHaveLength(1)
  })

  it("shows a multi-day span under every day it touches, and lists spans before timed rows", () => {
    const span: CalendarEvent = {
      id: "span1",
      name: "Conference",
      allDay: true,
      start: new Date(2022, 2, 1),
      end: new Date(2022, 2, 3), // half-open: touches day1 and day2, not day3
    }
    const timed: CalendarEvent = { id: "t1", name: "Standup", start: new Date(2022, 2, 1, 9, 0), end: new Date(2022, 2, 1, 9, 30) }
    const instance = createInstance({ days: [day1, day2, day3], events: [span, timed] })

    render(<AgendaView instance={instance} labels={defaultLabels} onEventOpen={vi.fn()} />)

    expect(document.querySelectorAll(".cal-agenda-day")).toHaveLength(2)

    const day1Rows = within(findDayBlock(1)).getAllByRole("button")
    expect(day1Rows).toHaveLength(2)
    expect(day1Rows[0]).toHaveClass("cal-agenda-span")
    expect(day1Rows[1]).toHaveClass("cal-agenda-timed")

    const day2Rows = within(findDayBlock(2)).getAllByRole("button")
    expect(day2Rows).toHaveLength(1)
    expect(day2Rows[0]).toHaveClass("cal-agenda-span")
  })

  it("calls onEventOpen with the event and the clicked row when a row is clicked", async () => {
    const user = userEvent.setup()
    const onEventOpen = vi.fn()
    const timed: CalendarEvent = { id: "t1", name: "Standup", start: new Date(2022, 2, 1, 9, 0), end: new Date(2022, 2, 1, 9, 30) }
    const instance = createInstance({ days: [day1], events: [timed] })
    render(<AgendaView instance={instance} labels={defaultLabels} onEventOpen={onEventOpen} />)

    await user.click(screen.getByRole("button", { name: /Standup/ }))

    expect(onEventOpen).toHaveBeenCalledTimes(1)
    const [openedEvent, anchor] = onEventOpen.mock.calls[0] as [CalendarEvent, HTMLElement]
    expect(openedEvent).toBe(timed)
    expect(anchor.tagName).toBe("BUTTON")
  })

  it("shows the empty-state message when there are no events", () => {
    const instance = createInstance({ days: [day1, day2], events: [] })

    render(<AgendaView instance={instance} labels={defaultLabels} onEventOpen={vi.fn()} />)

    expect(screen.getByText(defaultLabels.noEvents)).toBeInTheDocument()
  })
})
