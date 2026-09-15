import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { addDays, startOfDay } from "../../core/date"
import type { CalendarInstance } from "../../instance"
import type { CalendarEvent, EventDraft } from "../../types"
import { defaultLabels } from "../labels"
import type { AnchorRect } from "./anchor"
import { TimeGrid } from "./TimeGrid"

/** The grid is mocked 1440px tall over a 24h day, so 1px = 1 minute. */
const BODY_HEIGHT = 1440
const BODY_WIDTH = 700
const GUTTER_WIDTH = 56
/** (700 − 56) / 7 — the width one day gets in the mocked week. */
const COLUMN_WIDTH = 92

/** Monday 14 March 2022 — the week the Bryntum demo opens on. */
const WEEK_START = new Date(2022, 2, 14)

/** `count` consecutive days from `start`. */
function daysFrom(start: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, index) => addDays(start, index))
}

/**
 * jsdom lays nothing out, so every coordinate the grid reads has to be
 * supplied. Columns answer from their `data-column` index, which is what the
 * pointer math derives the columns' origin from.
 */
function mockGridRects(columnCount: number): void {
  const columnWidth = (BODY_WIDTH - GUTTER_WIDTH) / columnCount
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (this.classList.contains("cal-timegrid-body")) return new DOMRect(0, 0, BODY_WIDTH, BODY_HEIGHT)
    if (this.classList.contains("cal-timegrid-col")) {
      const index = Number(this.getAttribute("data-column") ?? 0)
      return new DOMRect(GUTTER_WIDTH + index * columnWidth, 0, columnWidth, BODY_HEIGHT)
    }
    return new DOMRect(0, 0, 0, 0)
  })
}

/** `root.querySelector`, failing the test rather than handing back `null`. */
function must(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector(selector)
  if (!(element instanceof HTMLElement)) throw new Error(`No element matched ${selector}`)
  return element
}

/** A CalendarInstance literal with spy actions — the hook that really builds one belongs to another agent. */
function makeInstance(overrides: Partial<CalendarInstance> = {}): CalendarInstance {
  return {
    id: "test",
    date: WEEK_START,
    view: "week",
    range: { start: WEEK_START, end: addDays(WEEK_START, 7) },
    days: daysFrom(WEEK_START, 7),
    events: [],
    resources: [],
    hiddenResourceIds: [],
    filterText: "",
    showWeekends: true,
    status: "idle",
    error: null,
    pendingIds: new Set<string>(),
    flags: { create: true, move: true, resize: true, edit: true, remove: true },
    settings: { weekStartsOn: 1, locale: "en-GB", dayStartHour: 0, dayEndHour: 24, snapMinutes: 15, defaultEventMinutes: 60 },
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
    createEvent: vi.fn(async () => null),
    updateEvent: vi.fn(async () => null),
    removeEvent: vi.fn(async () => false),
    resourceOf: vi.fn(() => undefined),
    colorOf: () => "#3b82f6",
    ...overrides,
  }
}

/** Wednesday 09:00–10:00 by default; `overrides` wins. */
function makeEvent(overrides: Partial<CalendarEvent> & Pick<CalendarEvent, "id">): CalendarEvent {
  return { name: "Breakfast", start: new Date(2022, 2, 16, 9, 0), end: new Date(2022, 2, 16, 10, 0), ...overrides }
}

/** Renders the grid with spy callbacks and hands them back with the container. */
function renderGrid(instance: CalendarInstance) {
  const onEventOpen = vi.fn<(event: CalendarEvent, anchor: HTMLElement) => void>()
  const onCreateRequest = vi.fn<(draft: EventDraft, anchor: AnchorRect) => void>()
  const onEventHover = vi.fn<(event: CalendarEvent | null, anchor: HTMLElement | null) => void>()
  const view = render(
    <TimeGrid
      instance={instance}
      labels={defaultLabels}
      onEventOpen={onEventOpen}
      onCreateRequest={onCreateRequest}
      onEventHover={onEventHover}
    />,
  )
  return { ...view, onEventOpen, onCreateRequest, onEventHover }
}

describe("TimeGrid", () => {
  beforeEach(() => {
    mockGridRects(7)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders one day header per visible day", () => {
    const { container } = renderGrid(makeInstance())

    expect(container.querySelectorAll(".cal-day-header")).toHaveLength(7)
  })

  it("renders a single day header in day view", () => {
    const { container } = renderGrid(makeInstance({ view: "day", days: [WEEK_START] }))

    expect(container.querySelectorAll(".cal-day-header")).toHaveLength(1)
  })

  it("marks only today's header as today", () => {
    const today = startOfDay(new Date())
    const { container } = renderGrid(makeInstance({ days: [addDays(today, -1), today, addDays(today, 1)] }))

    const marked = container.querySelectorAll(".cal-day-header.cal-today")
    expect(marked).toHaveLength(1)
    expect(marked[0]).toHaveTextContent(String(today.getDate()))
  })

  it("draws a timed event in its own day column, with its time and name", () => {
    const { container } = renderGrid(makeInstance({ events: [makeEvent({ id: "e1" })] }))

    const chip = must(container, '[data-event-id="e1"]')
    expect(chip).toHaveTextContent("Breakfast")
    expect(chip).toHaveTextContent("09:00")
    expect(chip.closest(".cal-timegrid-col")).toHaveAttribute("data-column", "2")
  })

  it("keeps all-day events in the all-day row instead of the hour grid", () => {
    const allDay = makeEvent({ id: "a1", name: "Conference", start: new Date(2022, 2, 15), end: new Date(2022, 2, 17), allDay: true })
    const { container } = renderGrid(makeInstance({ events: [allDay] }))

    const pill = screen.getByText("Conference")
    expect(pill.closest(".cal-allday-row")).not.toBeNull()
    expect(must(container, ".cal-timegrid-body").contains(pill)).toBe(false)
  })

  it("opens an all-day event on click", () => {
    const allDay = makeEvent({ id: "a1", name: "Conference", start: new Date(2022, 2, 15), end: new Date(2022, 2, 17), allDay: true })
    const { onEventOpen } = renderGrid(makeInstance({ events: [allDay] }))

    fireEvent.click(screen.getByText("Conference"))

    expect(onEventOpen).toHaveBeenCalledWith(allDay, expect.any(HTMLElement))
  })

  it("collapses all-day events past the third row into a +N more drill-in", () => {
    const spans = [1, 2, 3, 4].map((n) =>
      makeEvent({ id: `a${n}`, name: `Span ${n}`, start: new Date(2022, 2, 15), end: new Date(2022, 2, 16), allDay: true }),
    )
    const instance = makeInstance({ events: spans })
    renderGrid(instance)

    fireEvent.click(screen.getByRole("button", { name: "+1 more" }))

    expect(instance.setDate).toHaveBeenCalledWith(new Date(2022, 2, 15))
    expect(instance.setView).toHaveBeenCalledWith("day")
  })

  it("opens an event on click", () => {
    const event = makeEvent({ id: "e1" })
    const { onEventOpen } = renderGrid(makeInstance({ events: [event] }))

    fireEvent.click(screen.getByText("Breakfast"))

    expect(onEventOpen).toHaveBeenCalledWith(event, expect.any(HTMLElement))
  })

  it("also opens an event on double-click, only once", async () => {
    const event = makeEvent({ id: "e1" })
    const user = userEvent.setup()
    const { onEventOpen } = renderGrid(makeInstance({ events: [event] }))

    await user.dblClick(screen.getByText("Breakfast"))

    expect(onEventOpen).toHaveBeenCalledTimes(1)
  })

  it("does not open an event when a click follows a drag that moved it", () => {
    const event = makeEvent({ id: "e1" })
    const { container, onEventOpen } = renderGrid(makeInstance({ events: [event] }))
    const chip = must(container, '[data-event-id="e1"]')
    const body = must(container, ".cal-timegrid-body")

    fireEvent.pointerDown(chip, { pointerId: 1, button: 0, clientX: GUTTER_WIDTH + 2 * COLUMN_WIDTH + 10, clientY: 540 })
    fireEvent.pointerMove(body, { pointerId: 1, clientX: GUTTER_WIDTH + 2 * COLUMN_WIDTH + 10, clientY: 600 })
    fireEvent.pointerUp(body, { pointerId: 1, clientX: GUTTER_WIDTH + 2 * COLUMN_WIDTH + 10, clientY: 600 })
    // A real browser still fires `click` after a mouseup-following-a-drag; jsdom does not synthesise
    // one from the pointer sequence above, so the drag's own aftermath has to be simulated explicitly.
    fireEvent.click(chip)

    expect(onEventOpen).not.toHaveBeenCalled()
  })

  it("opens an event when Enter is pressed on its chip", () => {
    const event = makeEvent({ id: "e1" })
    const { container, onEventOpen } = renderGrid(makeInstance({ events: [event] }))

    fireEvent.keyDown(must(container, '[data-event-id="e1"]'), { key: "Enter" })

    expect(onEventOpen).toHaveBeenCalledWith(event, expect.any(HTMLElement))
  })

  it("reports hovering an event and leaving it", () => {
    const event = makeEvent({ id: "e1" })
    const { container, onEventHover } = renderGrid(makeInstance({ events: [event] }))

    const chip = must(container, '[data-event-id="e1"]')
    fireEvent.mouseEnter(chip)
    fireEvent.mouseLeave(chip)

    expect(onEventHover).toHaveBeenNthCalledWith(1, event, chip)
    expect(onEventHover).toHaveBeenNthCalledWith(2, null, null)
  })

  it("requests a default-length event snapped to the nearest step on double-click of empty space", () => {
    const { container, onCreateRequest } = renderGrid(makeInstance())

    fireEvent.dblClick(must(container, '.cal-timegrid-col[data-column="2"]'), { clientX: 300, clientY: 545 }) // 09:05 → 09:00

    expect(onCreateRequest).toHaveBeenCalledTimes(1)
    const call = onCreateRequest.mock.calls[0]
    expect(call?.[0]).toMatchObject({ start: new Date(2022, 2, 16, 9, 0), end: new Date(2022, 2, 16, 10, 0), allDay: false })
    expect(call?.[1]).toEqual({ top: 540, left: GUTTER_WIDTH + 2 * COLUMN_WIDTH, width: COLUMN_WIDTH, height: 60 })
  })

  it("does not request an event when creating is disabled", () => {
    const instance = makeInstance({ flags: { create: false, move: true, resize: true, edit: true, remove: true } })
    const { container, onCreateRequest } = renderGrid(instance)

    fireEvent.dblClick(must(container, '.cal-timegrid-col[data-column="0"]'), { clientY: 545 })

    expect(onCreateRequest).not.toHaveBeenCalled()
  })
})
