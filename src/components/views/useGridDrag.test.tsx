import { fireEvent, render } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { addDays } from "../../core/date"
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
const POINTER_ID = 1

/** Monday 14 March 2022. */
const WEEK_START = new Date(2022, 2, 14)

/** Viewport x a few pixels inside day column `index`. */
function xInColumn(index: number): number {
  return GUTTER_WIDTH + index * COLUMN_WIDTH + 10
}

/** jsdom lays nothing out, so the grid's geometry has to be supplied by hand. */
function mockGridRects(): void {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (this.classList.contains("cal-timegrid-body")) return new DOMRect(0, 0, BODY_WIDTH, BODY_HEIGHT)
    if (this.classList.contains("cal-timegrid-col")) {
      const index = Number(this.getAttribute("data-column") ?? 0)
      return new DOMRect(GUTTER_WIDTH + index * COLUMN_WIDTH, 0, COLUMN_WIDTH, BODY_HEIGHT)
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

/** A CalendarInstance literal with spy actions — the real hook belongs to another agent. */
function makeInstance(overrides: Partial<CalendarInstance> = {}): CalendarInstance {
  return {
    id: "test",
    date: WEEK_START,
    view: "week",
    range: { start: WEEK_START, end: addDays(WEEK_START, 7) },
    days: Array.from({ length: 7 }, (_, index) => addDays(WEEK_START, index)),
    events: [],
    resources: [],
    hiddenResourceIds: [],
    filterText: "",
    showWeekends: true,
    status: "idle",
    error: null,
    pendingIds: new Set<string>(),
    flags: { create: true, move: true, resize: true, edit: true, remove: true },
    settings: { weekStartsOn: 1, locale: "en-GB", dayStartHour: 0, dayEndHour: 24, snapMinutes: 15, defaultEventMinutes: 60, now: () => new Date() },
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
    createEvent: vi.fn(async () => null),
    updateEvent: vi.fn(async () => null),
    removeEvent: vi.fn(async () => false),
    resourceOf: vi.fn(() => undefined),
    colorOf: () => "#3b82f6",
    ...overrides,
  }
}

/** Tuesday 09:00–10:00 (day column 1); `overrides` wins. */
function makeEvent(overrides: Partial<CalendarEvent> & Pick<CalendarEvent, "id">): CalendarEvent {
  return { name: "Breakfast", start: new Date(2022, 2, 15, 9, 0), end: new Date(2022, 2, 15, 10, 0), ...overrides }
}

/** Renders the grid and returns the container, the body element and the create spy. */
function renderGrid(instance: CalendarInstance) {
  const onCreateRequest = vi.fn<(draft: EventDraft, anchor: AnchorRect) => void>()
  const { container } = render(
    <TimeGrid
      instance={instance}
      labels={defaultLabels}
      onEventOpen={vi.fn()}
      onCreateRequest={onCreateRequest}
      onEventHover={vi.fn()}
    />,
  )
  return { container, body: must(container, ".cal-timegrid-body"), onCreateRequest }
}

/** Presses on `from`, moves to `to`, and (unless told otherwise) releases there. */
function drag(
  body: HTMLElement,
  from: HTMLElement,
  start: { x: number; y: number },
  to: { x: number; y: number },
  options: { release?: boolean } = {},
): void {
  fireEvent.pointerDown(from, { pointerId: POINTER_ID, button: 0, clientX: start.x, clientY: start.y })
  fireEvent.pointerMove(body, { pointerId: POINTER_ID, clientX: to.x, clientY: to.y })
  if (options.release !== false) fireEvent.pointerUp(body, { pointerId: POINTER_ID, clientX: to.x, clientY: to.y })
}

describe("useGridDrag", () => {
  beforeAll(() => {
    // jsdom implements PointerEvent but not pointer capture; the hook degrades
    // gracefully, and the stubs keep that path exercised rather than skipped.
    Element.prototype.setPointerCapture = vi.fn()
    Element.prototype.releasePointerCapture = vi.fn()
    Element.prototype.hasPointerCapture = vi.fn(() => false)
  })

  beforeEach(() => {
    mockGridRects()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("requests an event covering the range a drag on empty space swept", () => {
    const instance = makeInstance({
      resources: [
        { id: "r1", name: "Hidden", color: "#111111" },
        { id: "r2", name: "Visible", color: "#222222" },
      ],
      hiddenResourceIds: ["r1"],
    })
    const { container, body, onCreateRequest } = renderGrid(instance)

    drag(body, must(container, '.cal-timegrid-col[data-column="2"]'), { x: xInColumn(2), y: 540 }, { x: xInColumn(2), y: 660 })

    expect(onCreateRequest).toHaveBeenCalledTimes(1)
    const call = onCreateRequest.mock.calls[0]
    expect(call?.[0]).toMatchObject({
      start: new Date(2022, 2, 16, 9, 0),
      end: new Date(2022, 2, 16, 11, 0),
      allDay: false,
      resourceId: "r2",
    })
    expect(call?.[1]).toEqual({ top: 540, left: GUTTER_WIDTH + 2 * COLUMN_WIDTH, width: COLUMN_WIDTH, height: 120 })
  })

  it("treats a press that never moves as a click, not a drag", () => {
    const { container, body, onCreateRequest } = renderGrid(makeInstance())

    const column = must(container, '.cal-timegrid-col[data-column="2"]')
    fireEvent.pointerDown(column, { pointerId: POINTER_ID, button: 0, clientX: xInColumn(2), clientY: 540 })
    fireEvent.pointerUp(body, { pointerId: POINTER_ID, clientX: xInColumn(2), clientY: 540 })

    expect(onCreateRequest).not.toHaveBeenCalled()
  })

  it("moves an event to another day, keeping its length", () => {
    const instance = makeInstance({ events: [makeEvent({ id: "e1" })] })
    const { container, body } = renderGrid(instance)

    drag(body, must(container, '[data-event-id="e1"]'), { x: xInColumn(1), y: 540 }, { x: xInColumn(3), y: 600 })

    expect(instance.updateEvent).toHaveBeenCalledWith("e1", {
      start: new Date(2022, 2, 17, 10, 0),
      end: new Date(2022, 2, 17, 11, 0),
    })
  })

  it("changes only the end when the resize handle is dragged", () => {
    const instance = makeInstance({ events: [makeEvent({ id: "e1" })] })
    const { container, body } = renderGrid(instance)

    drag(body, must(container, '[data-event-id="e1"] .cal-event-resize'), { x: xInColumn(1), y: 600 }, { x: xInColumn(1), y: 720 })

    expect(instance.updateEvent).toHaveBeenCalledWith("e1", { end: new Date(2022, 2, 15, 12, 0) })
  })

  it("abandons the gesture when Escape is pressed mid-drag", () => {
    const instance = makeInstance({ events: [makeEvent({ id: "e1" })] })
    const { container, body } = renderGrid(instance)

    drag(body, must(container, '[data-event-id="e1"]'), { x: xInColumn(1), y: 540 }, { x: xInColumn(3), y: 600 }, { release: false })
    expect(container.querySelector(".cal-event-ghost")).not.toBeNull()

    fireEvent.keyDown(window, { key: "Escape" })
    fireEvent.pointerUp(body, { pointerId: POINTER_ID, clientX: xInColumn(3), clientY: 600 })

    expect(container.querySelector(".cal-event-ghost")).toBeNull()
    expect(instance.updateEvent).not.toHaveBeenCalled()
  })

  it("refuses to move a read-only event", () => {
    const instance = makeInstance({ events: [makeEvent({ id: "e1", readOnly: true })] })
    const { container, body } = renderGrid(instance)

    drag(body, must(container, '[data-event-id="e1"]'), { x: xInColumn(1), y: 540 }, { x: xInColumn(3), y: 600 })

    expect(instance.updateEvent).not.toHaveBeenCalled()
  })

  it("refuses to move anything when the move feature is off", () => {
    const instance = makeInstance({
      events: [makeEvent({ id: "e1" })],
      flags: { create: true, move: false, resize: true, edit: true, remove: true },
    })
    const { container, body } = renderGrid(instance)

    drag(body, must(container, '[data-event-id="e1"]'), { x: xInColumn(1), y: 540 }, { x: xInColumn(3), y: 600 })

    expect(instance.updateEvent).not.toHaveBeenCalled()
  })

  it("offers no resize handle when the resize feature is off", () => {
    const instance = makeInstance({
      events: [makeEvent({ id: "e1" })],
      flags: { create: true, move: true, resize: false, edit: true, remove: true },
    })
    const { container } = renderGrid(instance)

    expect(container.querySelector(".cal-event-resize")).toBeNull()
  })
})
