import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { CalendarInstance } from "../instance"
import type { CalendarEvent } from "../types"
import { addMonths, startOfMonth } from "../core/date"
import { formatTitle } from "../core/format"
import { defaultLabels } from "./labels"
import { MiniCalendar } from "./MiniCalendar"

/** A minimal fake `CalendarInstance`, built by hand so this test never depends on `useCalendar`. */
function createInstance(overrides: Partial<CalendarInstance<unknown>> = {}): CalendarInstance<unknown> {
  const date = new Date(2022, 2, 15)
  return {
    id: "cal",
    date,
    view: "month",
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

describe("MiniCalendar", () => {
  it("renders a 6-week grid of 42 day cells", () => {
    const instance = createInstance({ date: new Date(2022, 2, 15) })

    render(<MiniCalendar instance={instance} labels={defaultLabels} />)

    expect(screen.getAllByRole("gridcell")).toHaveLength(42)
  })

  it("calls setDate with the clicked day, from the currently displayed month", async () => {
    const user = userEvent.setup()
    const instance = createInstance({ date: new Date(2022, 2, 15) })
    render(<MiniCalendar instance={instance} labels={defaultLabels} />)

    // "10" may also appear for a neighbouring month's padding day; pick the
    // one that belongs to the displayed month (not `cal-mini-other`).
    const candidates = screen.getAllByRole("gridcell", { name: "10" })
    const marchTenth = candidates.find((cell) => !cell.className.includes("cal-mini-other"))
    expect(marchTenth).toBeDefined()

    await user.click(marchTenth as HTMLElement)

    expect(instance.setDate).toHaveBeenCalledTimes(1)
    const clickedDay = (instance.setDate as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Date
    expect(clickedDay.getFullYear()).toBe(2022)
    expect(clickedDay.getMonth()).toBe(2)
    expect(clickedDay.getDate()).toBe(10)
  })

  it("marks today and the selected date (instance.date) with their classes", () => {
    const today = new Date()
    const instance = createInstance({ date: today })
    render(<MiniCalendar instance={instance} labels={defaultLabels} />)

    const candidates = screen.getAllByRole("gridcell", { name: String(today.getDate()) })
    const todayCell = candidates.find((cell) => !cell.className.includes("cal-mini-other"))

    expect(todayCell).toBeDefined()
    expect(todayCell?.className).toContain("cal-mini-today")
    expect(todayCell?.className).toContain("cal-mini-selected")
  })

  it("moves its own header forward a month without touching instance.date", async () => {
    const user = userEvent.setup()
    const date = new Date(2022, 2, 15)
    const instance = createInstance({ date })
    render(<MiniCalendar instance={instance} labels={defaultLabels} />)

    await user.click(screen.getByRole("button", { name: `${defaultLabels.next} ${defaultLabels.month}` }))

    const nextMonth = addMonths(startOfMonth(date), 1)
    expect(screen.getByText(formatTitle("month", nextMonth, "en-US"))).toBeInTheDocument()
    expect(instance.setDate).not.toHaveBeenCalled()
  })
})
