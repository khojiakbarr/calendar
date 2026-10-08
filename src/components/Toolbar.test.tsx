import { afterEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { CalendarInstance } from "../instance"
import type { CalendarEvent } from "../types"
import { formatTitle } from "../core/format"
import { isoWeek } from "../core/date"
import { fill } from "../core/labels"
import { defaultLabels } from "./labels"
import { Toolbar } from "./Toolbar"

/** Stubs `window.matchMedia` so only `query` matches — everything else reports no match. */
function stubMatchMedia(query: string): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((candidate: string) => ({
      matches: candidate === query,
      media: candidate,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

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
    settings: { weekStartsOn: 1, locale: "en-US", dayStartHour: 0, dayEndHour: 24, snapMinutes: 15, defaultEventMinutes: 60, now: () => new Date(), maxEventColumns: 3, agendaSpans: "each" },
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
    resourceOf: vi.fn(),
    colorOf: vi.fn(() => "#3b82f6"),
    ...overrides,
  }
}

describe("Toolbar", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("shows the day-view title for the anchored date", () => {
    // Arrange
    const date = new Date(2022, 2, 15)
    const instance = createInstance({ view: "day", date })

    // Act
    render(<Toolbar instance={instance} labels={defaultLabels} sidebarOpen onToggleSidebar={vi.fn()} />)

    // Assert
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(formatTitle("day", date, "en-US"))
  })

  it("shows the month+year title for month view", () => {
    const date = new Date(2022, 2, 15)
    const instance = createInstance({ view: "month", date })

    render(<Toolbar instance={instance} labels={defaultLabels} sidebarOpen onToggleSidebar={vi.fn()} />)

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(formatTitle("month", date, "en-US"))
  })

  it("shows a week-number badge only in week view", () => {
    const date = new Date(2022, 2, 15)
    const weekInstance = createInstance({ view: "week", date })
    const { rerender } = render(<Toolbar instance={weekInstance} labels={defaultLabels} sidebarOpen onToggleSidebar={vi.fn()} />)
    expect(screen.getByText(fill(defaultLabels.weekNumber, { n: isoWeek(date) }))).toBeInTheDocument()

    const dayInstance = createInstance({ view: "day", date })
    rerender(<Toolbar instance={dayInstance} labels={defaultLabels} sidebarOpen onToggleSidebar={vi.fn()} />)
    expect(screen.queryByText(fill(defaultLabels.weekNumber, { n: isoWeek(date) }))).not.toBeInTheDocument()
  })

  it("shows an event-count badge in agenda view", () => {
    const events = [
      { id: "e1", name: "A", start: new Date(2022, 2, 1), end: new Date(2022, 2, 1, 1) },
      { id: "e2", name: "B", start: new Date(2022, 2, 2), end: new Date(2022, 2, 2, 1) },
    ] satisfies CalendarEvent[]
    const instance = createInstance({ view: "agenda", events })

    render(<Toolbar instance={instance} labels={defaultLabels} sidebarOpen onToggleSidebar={vi.fn()} />)

    expect(screen.getByText(fill(defaultLabels.eventCount, { n: 2 }))).toBeInTheDocument()
  })

  it("switches the view and marks the active one pressed", async () => {
    const user = userEvent.setup()
    const instance = createInstance({ view: "week" })
    render(<Toolbar instance={instance} labels={defaultLabels} sidebarOpen onToggleSidebar={vi.fn()} />)

    const weekButton = screen.getByRole("button", { name: defaultLabels.week })
    const monthButton = screen.getByRole("button", { name: defaultLabels.month })
    expect(weekButton).toHaveAttribute("aria-pressed", "true")
    expect(monthButton).toHaveAttribute("aria-pressed", "false")

    await user.click(monthButton)

    expect(instance.setView).toHaveBeenCalledWith("month")
  })

  it("calls goPrevious, goNext and goToday from their toolbar buttons", async () => {
    const user = userEvent.setup()
    const instance = createInstance()
    render(<Toolbar instance={instance} labels={defaultLabels} sidebarOpen onToggleSidebar={vi.fn()} />)

    await user.click(screen.getByRole("button", { name: defaultLabels.previous }))
    await user.click(screen.getByRole("button", { name: defaultLabels.next }))
    await user.click(screen.getByRole("button", { name: defaultLabels.today }))

    expect(instance.goPrevious).toHaveBeenCalledTimes(1)
    expect(instance.goNext).toHaveBeenCalledTimes(1)
    expect(instance.goToday).toHaveBeenCalledTimes(1)
  })

  it("toggles showWeekends from the settings menu and closes the menu on Escape", async () => {
    const user = userEvent.setup()
    const instance = createInstance({ showWeekends: true })
    render(<Toolbar instance={instance} labels={defaultLabels} sidebarOpen onToggleSidebar={vi.fn()} />)

    await user.click(screen.getByRole("button", { name: defaultLabels.settings }))
    const checkbox = screen.getByRole("checkbox", { name: defaultLabels.showWeekends })
    expect(checkbox).toBeChecked()

    await user.click(checkbox)
    expect(instance.setShowWeekends).toHaveBeenCalledWith(false)
    expect(screen.getByRole("menu")).toBeInTheDocument()

    await user.keyboard("{Escape}")
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })

  it("hides the New event button when instance.flags.create is false", () => {
    const instance = createInstance({ flags: { create: false, move: true, resize: true, edit: true, remove: true } })
    render(<Toolbar instance={instance} labels={defaultLabels} sidebarOpen onToggleSidebar={vi.fn()} onNewEvent={vi.fn()} />)

    expect(screen.queryByRole("button", { name: defaultLabels.newEvent })).not.toBeInTheDocument()
  })

  it("hides the New event button when onNewEvent is not given, even if creation is allowed", () => {
    const instance = createInstance({ flags: { create: true, move: true, resize: true, edit: true, remove: true } })
    render(<Toolbar instance={instance} labels={defaultLabels} sidebarOpen onToggleSidebar={vi.fn()} />)

    expect(screen.queryByRole("button", { name: defaultLabels.newEvent })).not.toBeInTheDocument()
  })

  it("shows the New event button when creation is allowed and onNewEvent is given", () => {
    const instance = createInstance({ flags: { create: true, move: true, resize: true, edit: true, remove: true } })
    render(<Toolbar instance={instance} labels={defaultLabels} sidebarOpen onToggleSidebar={vi.fn()} onNewEvent={vi.fn()} />)

    expect(screen.getByRole("button", { name: defaultLabels.newEvent })).toBeInTheDocument()
  })

  it("collapses the New event button to icon-only, keeping its aria-label, at a narrow viewport", () => {
    stubMatchMedia("(max-width: 640px)")
    const instance = createInstance()
    render(<Toolbar instance={instance} labels={defaultLabels} sidebarOpen onToggleSidebar={vi.fn()} onNewEvent={vi.fn()} />)

    // The accessible name still resolves via aria-label even with no visible text.
    const button = screen.getByRole("button", { name: defaultLabels.newEvent })
    expect(button).toHaveAttribute("aria-label", defaultLabels.newEvent)
    expect(button).not.toHaveTextContent(defaultLabels.newEvent)
  })
})
