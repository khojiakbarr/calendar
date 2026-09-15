import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { CalendarEvent, EventSource } from "../types"
import { useCalendar } from "../useCalendar"
import { Calendar } from "./Calendar"
import type { CalendarClasses } from "./classesContext"
import { defaultLabels } from "./labels"

/** A promise the test settles by hand, standing in for a slow server. */
interface Deferred<T> {
  promise: Promise<T>
  resolve(value: T): void
}

function deferred<T>(): Deferred<T> {
  let resolveFn: (value: T) => void = () => {}
  const promise = new Promise<T>((resolve) => {
    resolveFn = resolve
  })
  return { promise, resolve: (value) => resolveFn(value) }
}

/** `list[index]`, narrowed past `noUncheckedIndexedAccess` — fails loudly instead of handing back `undefined`. */
function nth<T>(list: readonly T[], index: number): T {
  const item = list[index]
  if (item === undefined) throw new Error(`No entry ${index} in a list of ${list.length}`)
  return item
}

/**
 * A resolved-on-demand `EventSource`, minimal enough that this suite only
 * needs the one call every test makes: the initial load.
 */
function fakeSource() {
  const loads: Deferred<CalendarEvent[]>[] = []
  const source: EventSource = {
    load: () => {
      const pending = deferred<CalendarEvent[]>()
      loads.push(pending)
      return pending.promise
    },
    create: () => Promise.reject(new Error("not exercised")),
    update: () => Promise.reject(new Error("not exercised")),
    remove: () => Promise.resolve(),
  }
  return { source, loads }
}

/** Tuesday 15 March 2022 — same anchor `Calendar.test.tsx` uses. */
const ANCHOR = new Date(2022, 2, 15)

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "evt-1",
    name: "Standup",
    start: new Date(2022, 2, 15, 9, 0),
    end: new Date(2022, 2, 15, 10, 0),
    ...overrides,
  }
}

/** Wires a real `useCalendar` to `Calendar` — this suite tests `classes` against the actual shell, not a stand-in. */
function Harness({
  source,
  classes,
  initialView,
}: {
  source: EventSource
  classes?: CalendarClasses
  initialView?: "week" | "month"
}) {
  const instance = useCalendar({
    id: "test",
    source,
    initialDate: ANCHOR,
    initialView: initialView ?? "week",
    locale: "en-US",
  })
  return <Calendar instance={instance} {...(classes === undefined ? {} : { classes })} />
}

describe("Calendar classes prop", () => {
  it("appends each configured slot class alongside the slot's own cal-* class, never replacing it", async () => {
    const { source, loads } = fakeSource()
    const classes: CalendarClasses = { root: "r", toolbar: "t", event: "e", sidebar: "s", timeGrid: "g" }
    const { container } = render(<Harness source={source} classes={classes} />)

    await act(async () => nth(loads, 0).resolve([makeEvent()]))

    const root = container.querySelector(".cal-root")
    expect(root).not.toBeNull()
    expect(root).toHaveClass("cal-root")
    expect(root).toHaveClass("r")

    const toolbar = container.querySelector(".cal-toolbar")
    expect(toolbar).toHaveClass("cal-toolbar")
    expect(toolbar).toHaveClass("t")

    const sidebar = container.querySelector(".cal-sidebar")
    expect(sidebar).toHaveClass("cal-sidebar")
    expect(sidebar).toHaveClass("s")

    const timeGrid = container.querySelector(".cal-timegrid")
    expect(timeGrid).toHaveClass("cal-timegrid")
    expect(timeGrid).toHaveClass("g")

    const chip = screen.getByRole("button", { name: /Standup/ })
    expect(chip).toHaveClass("cal-event")
    expect(chip).toHaveClass("e")
  })

  it("renders every unconfigured slot with only its own cal-* class", async () => {
    const { source, loads } = fakeSource()
    const { container } = render(<Harness source={source} />)

    await act(async () => nth(loads, 0).resolve([]))

    const root = container.querySelector(".cal-root")
    expect(root?.className.trim()).toBe("cal-root")
  })

  it("puts the event slot class on a month-view chip too", async () => {
    const { source, loads } = fakeSource()
    const classes: CalendarClasses = { event: "e" }
    render(<Harness source={source} classes={classes} initialView="month" />)

    const timed = makeEvent({ start: new Date(2022, 2, 15, 9, 0), end: new Date(2022, 2, 15, 10, 0), name: "Standup" })
    await act(async () => nth(loads, 0).resolve([timed]))

    const chip = screen.getByRole("button", { name: /Standup/ })
    expect(chip).toHaveClass("cal-month-event")
    expect(chip).toHaveClass("e")
  })

  it("also switches to month view from the toolbar and still tags the chip", async () => {
    const { source, loads } = fakeSource()
    const classes: CalendarClasses = { event: "e", month: "m" }
    const { container } = render(<Harness source={source} classes={classes} />)

    const timed = makeEvent({ start: new Date(2022, 2, 15, 9, 0), end: new Date(2022, 2, 15, 10, 0), name: "Standup" })
    await act(async () => nth(loads, 0).resolve([timed]))

    fireEvent.click(screen.getByRole("button", { name: defaultLabels.month }))

    const monthRoot = container.querySelector(".cal-month")
    expect(monthRoot).toHaveClass("m")

    const chip = screen.getByRole("button", { name: /Standup/ })
    expect(chip).toHaveClass("cal-month-event")
    expect(chip).toHaveClass("e")
  })
})
