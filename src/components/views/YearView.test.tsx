import { fireEvent, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { defaultLabels } from "../labels"
import type { CalendarInstance, CalendarSettings } from "../../instance"
import type { CalendarEvent, CalendarFeatureFlags } from "../../types"
import { YearView } from "./YearView"

const ANCHOR = new Date(2022, 5, 15) // June 15 2022 — the year view shows the whole year regardless of the anchored month.

const SETTINGS: CalendarSettings = { weekStartsOn: 1, locale: "en-US", dayStartHour: 0, dayEndHour: 24, snapMinutes: 15, defaultEventMinutes: 60, now: () => new Date(), maxEventColumns: 3, agendaSpans: "each" }
const FLAGS: Required<CalendarFeatureFlags> = { create: true, move: true, resize: true, edit: true, remove: true }

let nextId = 0
function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  nextId += 1
  return { id: `evt-${nextId}`, name: `Event ${nextId}`, start: ANCHOR, end: ANCHOR, ...overrides }
}

/** Builds a fake `CalendarInstance` — B2 renders against this contract only, never `useCalendar`. */
function makeInstance(overrides: Partial<CalendarInstance> = {}): CalendarInstance {
  return {
    id: "cal",
    date: ANCHOR,
    view: "year",
    range: { start: ANCHOR, end: ANCHOR },
    days: [],
    events: [],
    resources: [],
    hiddenResourceIds: [],
    filterText: "",
    showWeekends: true,
    status: "idle",
    error: null,
    pendingIds: new Set(),
    flags: FLAGS,
    settings: SETTINGS,
    isCustomised: false,
    setDate: vi.fn(),
    setView: vi.fn(),
    goToday: vi.fn(),
    goNext: vi.fn(),
    goPrevious: vi.fn(),
    setFilterText: vi.fn(),
    setResourceHidden: vi.fn(),
    setResourcesHidden: vi.fn(),
    setShowWeekends: vi.fn(),
    resetPreferences: vi.fn(),
    reload: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    removeEvent: vi.fn(),
    resourceOf: () => undefined,
    colorOf: () => "#3b82f6",
    ...overrides,
  }
}

describe("YearView", () => {
  it("renders all 12 month titles for the anchored year", () => {
    const { container } = render(<YearView instance={makeInstance()} labels={defaultLabels} />)
    const titles = container.querySelectorAll(".cal-year-month-title")
    expect(titles).toHaveLength(12)
    expect(titles[0]).toHaveTextContent("January")
    expect(titles[11]).toHaveTextContent("December")
  })

  it("tints a day with 2 events using the second heat step", () => {
    const first = makeEvent({ start: new Date(2022, 2, 9, 9, 0), end: new Date(2022, 2, 9, 10, 0) })
    const second = makeEvent({ start: new Date(2022, 2, 9, 14, 0), end: new Date(2022, 2, 9, 15, 0) })
    const { container } = render(<YearView instance={makeInstance({ events: [first, second] })} labels={defaultLabels} />)

    const day = container.querySelector('[data-day="2022-03-09"]')
    expect(day).toHaveClass("cal-year-heat-2")
  })

  it("jumps to the day view when a day is clicked", () => {
    const instance = makeInstance()
    const { container } = render(<YearView instance={instance} labels={defaultLabels} />)

    const day = container.querySelector('[data-day="2022-03-09"]') as Element
    fireEvent.click(day)

    expect(instance.setDate).toHaveBeenCalledTimes(1)
    const calledWith = (instance.setDate as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Date
    expect(calledWith.getFullYear()).toBe(2022)
    expect(calledWith.getMonth()).toBe(2)
    expect(calledWith.getDate()).toBe(9)
    expect(instance.setView).toHaveBeenCalledWith("day")
  })
})
