import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { CalendarInstance } from "../instance"
import type { CalendarEvent, CalendarResource } from "../types"
import { defaultLabels } from "./labels"
import { ResourceFilter } from "./ResourceFilter"

const resources: CalendarResource[] = [
  { id: "r1", name: "Room A", color: "#3b82f6" },
  { id: "r2", name: "Room B", color: "#f59e0b" },
]

/** A minimal fake `CalendarInstance`, built by hand so this test never depends on `useCalendar`. */
function createInstance(overrides: Partial<CalendarInstance<unknown>> = {}): CalendarInstance<unknown> {
  const date = new Date(2022, 2, 15)
  return {
    id: "cal",
    date,
    view: "week",
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

describe("ResourceFilter", () => {
  it("checks resources that are not hidden and unchecks hidden ones", () => {
    const instance = createInstance({ resources, hiddenResourceIds: ["r2"] })

    render(<ResourceFilter instance={instance} labels={defaultLabels} />)

    expect(screen.getByRole("checkbox", { name: "Room A" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Room B" })).not.toBeChecked()
  })

  it("calls setResourceHidden(id, true) when an unhidden resource's checkbox is unchecked", async () => {
    const user = userEvent.setup()
    const instance = createInstance({ resources, hiddenResourceIds: [] })
    render(<ResourceFilter instance={instance} labels={defaultLabels} />)

    await user.click(screen.getByRole("checkbox", { name: "Room A" }))

    expect(instance.setResourceHidden).toHaveBeenCalledWith("r1", true)
  })

  it("calls setResourceHidden(id, false) when a hidden resource's checkbox is checked", async () => {
    const user = userEvent.setup()
    const instance = createInstance({ resources, hiddenResourceIds: ["r2"] })
    render(<ResourceFilter instance={instance} labels={defaultLabels} />)

    await user.click(screen.getByRole("checkbox", { name: "Room B" }))

    expect(instance.setResourceHidden).toHaveBeenCalledWith("r2", false)
  })

  it("renders nothing when there are no resources", () => {
    const instance = createInstance({ resources: [] })

    const { container } = render(<ResourceFilter instance={instance} labels={defaultLabels} />)

    expect(container).toBeEmptyDOMElement()
  })
})
