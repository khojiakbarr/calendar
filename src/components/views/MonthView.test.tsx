import { render, screen, within } from "@testing-library/react"
import { fireEvent } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { defaultLabels } from "../labels"
import { addDays } from "../../core/date"
import { visibleDays } from "../../core/range"
import type { CalendarInstance, CalendarSettings } from "../../instance"
import type { CalendarEvent, CalendarFeatureFlags, CalendarResource } from "../../types"
import { MonthView } from "./MonthView"

/** March 15 2022 — a Tuesday, matching the Bryntum demo month the rest of the suite anchors on. */
const ANCHOR = new Date(2022, 2, 15)

const SETTINGS: CalendarSettings = { weekStartsOn: 1, locale: "en-US", dayStartHour: 0, dayEndHour: 24, snapMinutes: 15, defaultEventMinutes: 60, now: () => new Date(), maxEventColumns: 3, agendaSpans: "each" }
const FLAGS: Required<CalendarFeatureFlags> = { create: true, move: true, resize: true, edit: true, remove: true }

let nextId = 0
function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  nextId += 1
  return { id: `evt-${nextId}`, name: `Event ${nextId}`, start: ANCHOR, end: addDays(ANCHOR, 1), ...overrides }
}

/** Builds a fake `CalendarInstance` — B2 renders against this contract only, never `useCalendar`. */
function makeInstance(overrides: Partial<CalendarInstance> = {}): CalendarInstance {
  const showWeekends = overrides.showWeekends ?? true
  const resources: CalendarResource[] = overrides.resources ?? []
  return {
    id: "cal",
    date: ANCHOR,
    view: "month",
    range: { start: ANCHOR, end: addDays(ANCHOR, 1) },
    days: visibleDays("month", ANCHOR, SETTINGS.weekStartsOn, showWeekends),
    events: [],
    resources,
    hiddenResourceIds: [],
    filterText: "",
    showWeekends,
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
    updateEvent: vi.fn().mockResolvedValue(null),
    removeEvent: vi.fn(),
    resourceOf: () => undefined,
    colorOf: () => "#3b82f6",
    ...overrides,
  }
}

/** Common props, so each test only overrides what it exercises. */
function makeProps(instance: CalendarInstance, extra: Partial<Parameters<typeof MonthView>[0]> = {}) {
  return {
    instance,
    labels: defaultLabels,
    onEventOpen: vi.fn(),
    onCreateRequest: vi.fn(),
    onEventHover: vi.fn(),
    rowLimit: 3,
    ...extra,
  }
}

beforeAll(() => {
  class FakeResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  vi.stubGlobal("ResizeObserver", FakeResizeObserver)
})

beforeEach(() => {
  Element.prototype.setPointerCapture = vi.fn()
  // jsdom does not implement elementFromPoint; tests stub its return value per case.
  document.elementFromPoint = vi.fn().mockReturnValue(null)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("MonthView", () => {
  it("renders 6 week-number cells and 42 day cells when weekends are shown, 30 when hidden", () => {
    const withWeekends = render(<MonthView {...makeProps(makeInstance({ showWeekends: true }))} />)
    expect(withWeekends.container.querySelectorAll(".cal-month-weeknum")).toHaveLength(6)
    expect(withWeekends.container.querySelectorAll(".cal-month-cell")).toHaveLength(42)
    withWeekends.unmount()

    const withoutWeekends = render(<MonthView {...makeProps(makeInstance({ showWeekends: false }))} />)
    expect(withoutWeekends.container.querySelectorAll(".cal-month-weeknum")).toHaveLength(6)
    expect(withoutWeekends.container.querySelectorAll(".cal-month-cell")).toHaveLength(30)
  })

  it("mutes a day cell that falls outside the anchored month", () => {
    const { container } = render(<MonthView {...makeProps(makeInstance())} />)
    // The grid for March 2022 (Monday-first weeks) starts Feb 28.
    const otherMonthCell = container.querySelector('[data-day="2022-02-28"]')
    expect(otherMonthCell).toHaveClass("cal-month-other")
  })

  it("marks today's cell with the today class", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2022, 2, 20))
    const { container } = render(<MonthView {...makeProps(makeInstance())} />)
    const todayCell = container.querySelector('[data-day="2022-03-20"] .cal-month-daynum')
    expect(todayCell).toHaveClass("cal-month-today")
  })

  it("renders a 3-day span as a single chip spanning 3 grid columns", () => {
    const span = makeEvent({ start: new Date(2022, 2, 7), end: new Date(2022, 2, 10), allDay: true, name: "Conference" })
    const { container } = render(<MonthView {...makeProps(makeInstance({ events: [span] }))} />)
    const chips = container.querySelectorAll(".cal-month-event-span")
    expect(chips).toHaveLength(1)
    expect((chips[0] as HTMLElement).style.gridColumn).toBe("1 / 4")
  })

  it("shows a timed event's time and name", () => {
    const timed = makeEvent({ start: new Date(2022, 2, 9, 9, 0), end: new Date(2022, 2, 9, 10, 0), name: "Standup" })
    render(<MonthView {...makeProps(makeInstance({ events: [timed] }))} />)
    const chip = screen.getByRole("button", { name: /Standup/ })
    expect(chip).toHaveTextContent("9 AM")
    expect(chip).toHaveTextContent("Standup")
  })

  it("shows a day's overflow as a dot per hidden event, four at most, named with the whole count", () => {
    const events = Array.from({ length: 7 }, (_, i) => makeEvent({ start: new Date(2022, 2, 9, 8 + i), end: new Date(2022, 2, 9, 9 + i), name: `Slot ${i}` }))
    const { container } = render(<MonthView {...makeProps(makeInstance({ events }), { rowLimit: 1 })} />)

    const more = screen.getByRole("button", { name: "+6 more" })
    expect(more).toHaveAttribute("aria-haspopup", "dialog")
    expect(more).toHaveAttribute("aria-expanded", "false")
    expect(more.querySelectorAll(".cal-month-more-dot")).toHaveLength(4)
    expect(more).toHaveTextContent("+2")
    expect(container.querySelectorAll(".cal-month-more")).toHaveLength(1)
  })

  it("keeps a line for the dots in a week that overflows, so they never fall under the row's edge", () => {
    // Six weeks in 600px: a 100px cell holds three rows — two beside the dots' line.
    const height = vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(600)
    const day = (n: number, name: string) => makeEvent({ start: new Date(2022, 2, 9, 8 + n), end: new Date(2022, 2, 9, 9 + n), name })
    const measured = (events: CalendarEvent[]) => (
      <MonthView instance={makeInstance({ events })} labels={defaultLabels} onEventOpen={vi.fn()} onCreateRequest={vi.fn()} onEventHover={vi.fn()} />
    )

    const fits = render(measured([day(0, "A"), day(1, "B"), day(2, "C")]))
    expect(fits.container.querySelectorAll(".cal-month-event")).toHaveLength(3)
    expect(fits.container.querySelector(".cal-month-more")).toBeNull()
    fits.unmount()

    const overflows = render(measured([day(0, "A"), day(1, "B"), day(2, "C"), day(3, "D")]))
    expect(overflows.container.querySelectorAll(".cal-month-event")).toHaveLength(2)
    const more = screen.getByRole("button", { name: "+2 more" })
    expect(more.style.gridRow).toBe("3")
    height.mockRestore()
  })

  it("shows two dots beside the count in a phone's narrow cell", () => {
    const events = Array.from({ length: 7 }, (_, i) => makeEvent({ start: new Date(2022, 2, 9, 8 + i), end: new Date(2022, 2, 9, 9 + i), name: `Slot ${i}` }))
    render(<MonthView {...makeProps(makeInstance({ events }), { rowLimit: 1, compact: true })} />)
    const more = screen.getByRole("button", { name: "+6 more" })
    expect(more.querySelectorAll(".cal-month-more-dot")).toHaveLength(2)
    expect(more).toHaveTextContent("+4")
  })

  it("draws a hidden plan's dot as a ring", () => {
    const shown = makeEvent({ start: new Date(2022, 2, 9, 8), end: new Date(2022, 2, 9, 9), name: "Shown" })
    const plan = makeEvent({ start: new Date(2022, 2, 9, 10), end: new Date(2022, 2, 9, 11), name: "Plan", appearance: "plan" })
    render(<MonthView {...makeProps(makeInstance({ events: [shown, plan] }), { rowLimit: 1 })} />)
    expect(screen.getByRole("button", { name: "+1 more" }).querySelector(".cal-month-more-dot")).toHaveClass("cal-month-more-dot-plan")
  })

  it("opens the day's card on its dots: every event of the day, the shown ones too, in the cell's order", () => {
    const span = makeEvent({ start: new Date(2022, 2, 7), end: new Date(2022, 2, 12), allDay: true, name: "Conference" })
    const lunch = makeEvent({ start: new Date(2022, 2, 9, 12), end: new Date(2022, 2, 9, 13), name: "Lunch" })
    const standup = makeEvent({ start: new Date(2022, 2, 9, 9), end: new Date(2022, 2, 9, 10), name: "Standup" })
    render(<MonthView {...makeProps(makeInstance({ events: [lunch, standup, span] }), { rowLimit: 1 })} />)

    const more = screen.getByRole("button", { name: "+2 more" })
    fireEvent.click(more)

    const card = screen.getByRole("dialog", { name: "Wednesday, March 9" })
    expect(more).toHaveAttribute("aria-expanded", "true")
    const items = within(card).getAllByRole("listitem").map((item) => item.textContent)
    expect(items).toEqual(["ConferenceMar 7 – Mar 11", "9 AMStandup", "12 PMLunch"])
  })

  it("opens an event picked in the day's card, anchored to the dots, and closes the card", () => {
    const shown = makeEvent({ start: new Date(2022, 2, 9, 8), end: new Date(2022, 2, 9, 9), name: "Shown" })
    const lunch = makeEvent({ start: new Date(2022, 2, 9, 12), end: new Date(2022, 2, 9, 13), name: "Lunch" })
    const onEventOpen = vi.fn()
    render(<MonthView {...makeProps(makeInstance({ events: [shown, lunch] }), { rowLimit: 1, onEventOpen })} />)

    const more = screen.getByRole("button", { name: "+1 more" })
    fireEvent.click(more)
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Lunch/ }))

    expect(onEventOpen).toHaveBeenCalledWith(expect.objectContaining({ id: lunch.id }), more)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("opens the day view from the date in the day's card", () => {
    const standup = makeEvent({ start: new Date(2022, 2, 9, 9), end: new Date(2022, 2, 9, 10), name: "Standup" })
    const lunch = makeEvent({ start: new Date(2022, 2, 9, 12), end: new Date(2022, 2, 9, 13), name: "Lunch" })
    const instance = makeInstance({ events: [standup, lunch] })
    render(<MonthView {...makeProps(instance, { rowLimit: 1 })} />)

    fireEvent.click(screen.getByRole("button", { name: "+1 more" }))
    fireEvent.click(screen.getByRole("button", { name: "Wednesday, March 9" }))

    const calledWith = (instance.setDate as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Date
    expect([calledWith.getFullYear(), calledWith.getMonth(), calledWith.getDate()]).toEqual([2022, 2, 9])
    expect(instance.setView).toHaveBeenCalledWith("day")
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("closes the day's card on Escape and gives the focus back to its dots", () => {
    const standup = makeEvent({ start: new Date(2022, 2, 9, 9), end: new Date(2022, 2, 9, 10), name: "Standup" })
    const lunch = makeEvent({ start: new Date(2022, 2, 9, 12), end: new Date(2022, 2, 9, 13), name: "Lunch" })
    render(<MonthView {...makeProps(makeInstance({ events: [standup, lunch] }), { rowLimit: 1 })} />)

    const more = screen.getByRole("button", { name: "+1 more" })
    more.focus()
    fireEvent.click(more)
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(more).toHaveFocus()
  })

  it("opens the editor when a chip is clicked", () => {
    const timed = makeEvent({ start: new Date(2022, 2, 9, 9, 0), end: new Date(2022, 2, 9, 10, 0), name: "Standup" })
    const onEventOpen = vi.fn()
    const instance = makeInstance({ events: [timed] })
    render(<MonthView {...makeProps(instance, { onEventOpen })} />)

    fireEvent.click(screen.getByRole("button", { name: /Standup/ }))

    expect(onEventOpen).toHaveBeenCalledTimes(1)
    expect(onEventOpen.mock.calls[0]?.[0]).toMatchObject({ id: timed.id })
  })

  it("requests an all-day draft for the day when its empty area is double-clicked", () => {
    const onCreateRequest = vi.fn()
    const instance = makeInstance()
    const { container } = render(<MonthView {...makeProps(instance, { onCreateRequest })} />)

    const cell = container.querySelector('[data-day="2022-03-09"]')
    expect(cell).not.toBeNull()
    fireEvent.doubleClick(cell as Element)

    expect(onCreateRequest).toHaveBeenCalledTimes(1)
    const [draft, anchor] = onCreateRequest.mock.calls[0] as [Record<string, unknown>, Record<string, number>]
    expect(draft).toMatchObject({ name: "", allDay: true })
    expect((draft["start"] as Date).getTime()).toBe(new Date(2022, 2, 9).getTime())
    expect((draft["end"] as Date).getTime()).toBe(new Date(2022, 2, 10).getTime())
    expect(draft).not.toHaveProperty("resourceId")
    expect(anchor).toEqual(expect.objectContaining({ top: expect.any(Number), left: expect.any(Number), width: expect.any(Number), height: expect.any(Number) }))
  })

  it("moves an event by whole days when its chip is dragged to another cell", () => {
    const event = makeEvent({ start: new Date(2022, 2, 9, 9, 0), end: new Date(2022, 2, 9, 10, 0), name: "Standup" })
    const instance = makeInstance({ events: [event] })
    const { container } = render(<MonthView {...makeProps(instance)} />)

    const chip = screen.getByRole("button", { name: /Standup/ })
    const targetCell = container.querySelector('[data-day="2022-03-11"]') as Element
    vi.mocked(document.elementFromPoint).mockReturnValue(targetCell)

    fireEvent.pointerDown(chip, { pointerId: 1, clientX: 0, clientY: 0, button: 0 })
    fireEvent.pointerMove(chip, { pointerId: 1, clientX: 20, clientY: 0 })
    fireEvent.pointerUp(chip, { pointerId: 1, clientX: 20, clientY: 0 })

    expect(instance.updateEvent).toHaveBeenCalledWith(event.id, {
      start: new Date(2022, 2, 11, 9, 0),
      end: new Date(2022, 2, 11, 10, 0),
    })
  })

  it("renders event chips as dots and marks the root compact when the compact prop is set", () => {
    const timed = makeEvent({ start: new Date(2022, 2, 9, 9, 0), end: new Date(2022, 2, 9, 10, 0), name: "Standup" })
    const { container } = render(<MonthView {...makeProps(makeInstance({ events: [timed] }), { compact: true })} />)

    expect(container.querySelector(".cal-month")).toHaveClass("cal-month-compact")
    // The chip itself is still in the DOM (compact styling is CSS-only) —
    // this just proves compact mode was actually switched on for it to sit under.
    expect(screen.getByRole("button", { name: /Standup/ })).toHaveClass("cal-month-event")
  })

  it("does not mark the root compact when the compact prop is false", () => {
    const { container } = render(<MonthView {...makeProps(makeInstance(), { compact: false })} />)
    expect(container.querySelector(".cal-month")).not.toHaveClass("cal-month-compact")
  })

  it("opens the day view when a cell is clicked in compact mode", () => {
    const instance = makeInstance()
    const { container } = render(<MonthView {...makeProps(instance, { compact: true })} />)

    const cell = container.querySelector('[data-day="2022-03-09"]')
    expect(cell).not.toBeNull()
    fireEvent.click(cell as Element)

    expect(instance.setDate).toHaveBeenCalledTimes(1)
    const calledWith = (instance.setDate as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Date
    expect(calledWith.getFullYear()).toBe(2022)
    expect(calledWith.getMonth()).toBe(2)
    expect(calledWith.getDate()).toBe(9)
    expect(instance.setView).toHaveBeenCalledWith("day")
  })

  it("does not open the day view from a cell click outside compact mode", () => {
    const instance = makeInstance()
    const { container } = render(<MonthView {...makeProps(instance, { compact: false })} />)

    const cell = container.querySelector('[data-day="2022-03-09"]')
    fireEvent.click(cell as Element)

    expect(instance.setDate).not.toHaveBeenCalled()
    expect(instance.setView).not.toHaveBeenCalled()
  })

  it("does not drag a read-only event", () => {
    const event = makeEvent({ start: new Date(2022, 2, 9, 9, 0), end: new Date(2022, 2, 9, 10, 0), name: "Locked", readOnly: true })
    const instance = makeInstance({ events: [event] })
    const { container } = render(<MonthView {...makeProps(instance)} />)

    const chip = screen.getByRole("button", { name: /Locked/ })
    const targetCell = container.querySelector('[data-day="2022-03-11"]') as Element
    vi.mocked(document.elementFromPoint).mockReturnValue(targetCell)

    fireEvent.pointerDown(chip, { pointerId: 1, clientX: 0, clientY: 0, button: 0 })
    fireEvent.pointerMove(chip, { pointerId: 1, clientX: 20, clientY: 0 })
    fireEvent.pointerUp(chip, { pointerId: 1, clientX: 20, clientY: 0 })

    expect(instance.updateEvent).not.toHaveBeenCalled()
  })
})
