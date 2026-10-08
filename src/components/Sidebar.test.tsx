import { afterEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { CalendarInstance } from "../instance"
import type { CalendarEvent } from "../types"
import { defaultLabels } from "./labels"
import { Sidebar } from "./Sidebar"

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

describe("Sidebar", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("renders no scrim at a normal (non-narrow) viewport", () => {
    stubMatchMedia("not-a-real-query")
    const instance = createInstance()
    const { container } = render(<Sidebar instance={instance} labels={defaultLabels} onClose={vi.fn()} />)

    expect(container.querySelector(".cal-sidebar-scrim")).not.toBeInTheDocument()
  })

  it("renders a scrim at a narrow viewport, and clicking it calls onClose", async () => {
    stubMatchMedia("(max-width: 900px)")
    const user = userEvent.setup()
    const onClose = vi.fn()
    const instance = createInstance()
    const { container } = render(<Sidebar instance={instance} labels={defaultLabels} onClose={onClose} />)

    const scrim = container.querySelector(".cal-sidebar-scrim")
    expect(scrim).toBeInTheDocument()

    await user.click(scrim as Element)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose from the header's close button", async () => {
    stubMatchMedia("(max-width: 900px)")
    const user = userEvent.setup()
    const onClose = vi.fn()
    const instance = createInstance()
    render(<Sidebar instance={instance} labels={defaultLabels} onClose={onClose} />)

    await user.click(screen.getByRole("button", { name: defaultLabels.close }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose on Escape at a narrow viewport", async () => {
    stubMatchMedia("(max-width: 900px)")
    const user = userEvent.setup()
    const onClose = vi.fn()
    const instance = createInstance()
    render(<Sidebar instance={instance} labels={defaultLabels} onClose={onClose} />)

    await user.keyboard("{Escape}")
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
