import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { addDays } from "../core/date"
import { formatTitle } from "../core/format"
import type { CalendarEvent, CalendarResource, EventDraft, EventPatch, EventSource } from "../types"
import { useCalendar } from "../useCalendar"
import { Calendar } from "./Calendar"
import { defaultLabels } from "./labels"

/** A promise the test settles by hand, standing in for a slow server. */
interface Deferred<T> {
  promise: Promise<T>
  resolve(value: T): void
  reject(reason: unknown): void
}

function deferred<T>(): Deferred<T> {
  const control: { resolve?: (value: T) => void; reject?: (reason: unknown) => void } = {}
  const promise = new Promise<T>((resolve, reject) => {
    control.resolve = resolve
    control.reject = reject
  })
  return { promise, resolve: (value) => control.resolve?.(value), reject: (reason) => control.reject?.(reason) }
}

/** `list[index]`, narrowed past `noUncheckedIndexedAccess` — fails loudly instead of handing back `undefined`. */
function nth<T>(list: readonly T[], index: number): T {
  const item = list[index]
  if (item === undefined) throw new Error(`No entry ${index} in a list of ${list.length}`)
  return item
}

interface UpdateCall {
  id: string
  patch: EventPatch
}

/**
 * An `EventSource` whose every call hangs until the test settles it, and
 * that records what it was asked to do — this suite drives the whole shell
 * through real `useCalendar` behaviour rather than a hand-built instance.
 */
function fakeSource() {
  const loads: Deferred<CalendarEvent[]>[] = []
  const creates: { draft: EventDraft; deferred: Deferred<CalendarEvent> }[] = []
  const updates: { call: UpdateCall; deferred: Deferred<CalendarEvent> }[] = []

  const source: EventSource = {
    load: () => {
      const pending = deferred<CalendarEvent[]>()
      loads.push(pending)
      return pending.promise
    },
    create: (draft) => {
      const pending = deferred<CalendarEvent>()
      creates.push({ draft, deferred: pending })
      return pending.promise
    },
    update: (id, patch) => {
      const pending = deferred<CalendarEvent>()
      updates.push({ call: { id, patch }, deferred: pending })
      return pending.promise
    },
    remove: () => Promise.resolve(),
  }

  return { source, loads, creates, updates }
}

/** Tuesday 15 March 2022, the day the rest of the suite anchors on. */
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

/** Wires a real `useCalendar` to `Calendar` — this suite tests the shell against the actual hook, not a stand-in. */
function Harness({ source, resources }: { source: EventSource; resources?: CalendarResource[] }) {
  const instance = useCalendar({
    id: "test",
    source,
    initialDate: ANCHOR,
    initialView: "week",
    locale: "en-US",
    ...(resources === undefined ? {} : { resources }),
  })
  return <Calendar instance={instance} />
}

/** `container.querySelector(".cal-root")`, narrowed — the element `onKeyDown` shortcuts are dispatched on. */
function mustRoot(container: HTMLElement): HTMLElement {
  const root = container.querySelector(".cal-root")
  if (!(root instanceof HTMLElement)) throw new Error("No .cal-root rendered")
  return root
}

describe("Calendar", () => {
  it("shows the toolbar, the week view and the sidebar, and renders what loads", async () => {
    const { source, loads } = fakeSource()
    render(<Harness source={source} />)

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(formatTitle("week", ANCHOR, "en-US"))
    expect(screen.getByPlaceholderText(defaultLabels.filterPlaceholder)).toBeInTheDocument()

    await act(async () => nth(loads, 0).resolve([makeEvent()]))

    expect(screen.getByRole("button", { name: /Standup/ })).toBeInTheDocument()
  })

  it("shows a progress bar while loading and hides it once events resolve", async () => {
    const { source, loads } = fakeSource()
    const { container } = render(<Harness source={source} />)

    expect(container.querySelector(".cal-progress")).not.toBeNull()

    await act(async () => nth(loads, 0).resolve([]))

    expect(container.querySelector(".cal-progress")).toBeNull()
  })

  it("shows an error strip with Retry, which asks the source again", async () => {
    const { source, loads } = fakeSource()
    render(<Harness source={source} />)

    await act(async () => nth(loads, 0).reject(new Error("offline")))

    expect(screen.getByRole("alert")).toHaveTextContent(defaultLabels.loadFailed)

    fireEvent.click(screen.getByRole("button", { name: defaultLabels.retry }))

    await waitFor(() => expect(loads).toHaveLength(2))
  })

  it("switches to the month grid from the toolbar", async () => {
    const { source, loads } = fakeSource()
    render(<Harness source={source} />)
    await act(async () => nth(loads, 0).resolve([]))

    fireEvent.click(screen.getByRole("button", { name: defaultLabels.month }))

    expect(screen.getByRole("grid", { name: defaultLabels.month })).toBeInTheDocument()
  })

  it("opens the editor prefilled when an event chip is clicked", async () => {
    const { source, loads } = fakeSource()
    render(<Harness source={source} />)
    await act(async () => nth(loads, 0).resolve([makeEvent()]))

    fireEvent.click(screen.getByRole("button", { name: /Standup/ }))

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: defaultLabels.editorEditTitle })).toBeInTheDocument()
    expect(screen.getByLabelText(defaultLabels.name)).toHaveValue("Standup")
  })

  it("also opens the editor on a double-click, without reopening a second time", async () => {
    const { source, loads } = fakeSource()
    const user = userEvent.setup()
    render(<Harness source={source} />)
    await act(async () => nth(loads, 0).resolve([makeEvent()]))

    await user.dblClick(screen.getByRole("button", { name: /Standup/ }))

    expect(screen.getAllByRole("dialog")).toHaveLength(1)
    expect(screen.getByLabelText(defaultLabels.name)).toHaveValue("Standup")
  })

  it("saves an edited event through source.update and closes the editor", async () => {
    const { source, loads, updates } = fakeSource()
    render(<Harness source={source} />)
    await act(async () => nth(loads, 0).resolve([makeEvent()]))

    fireEvent.click(screen.getByRole("button", { name: /Standup/ }))
    fireEvent.change(screen.getByLabelText(defaultLabels.name), { target: { value: "Planning" } })
    fireEvent.click(screen.getByRole("button", { name: defaultLabels.save }))

    expect(updates).toHaveLength(1)
    expect(nth(updates, 0).call.id).toBe("evt-1")
    expect(nth(updates, 0).call.patch.name).toBe("Planning")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("opens a create editor from the toolbar's New event button and saves through source.create", async () => {
    const { source, loads, creates } = fakeSource()
    render(<Harness source={source} />)
    await act(async () => nth(loads, 0).resolve([]))

    fireEvent.click(screen.getByRole("button", { name: defaultLabels.newEvent }))
    expect(screen.getByRole("heading", { level: 3, name: defaultLabels.editorNewTitle })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(defaultLabels.name), { target: { value: "Team sync" } })
    fireEvent.click(screen.getByRole("button", { name: defaultLabels.save }))

    expect(creates).toHaveLength(1)
    expect(nth(creates, 0).draft.name).toBe("Team sync")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("shifts the title forward on ArrowRight", async () => {
    const { source, loads } = fakeSource()
    const { container } = render(<Harness source={source} />)
    await act(async () => nth(loads, 0).resolve([]))

    fireEvent.keyDown(mustRoot(container), { key: "ArrowRight" })

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(formatTitle("week", addDays(ANCHOR, 7), "en-US"))
  })

  it("closes the editor on Escape", async () => {
    const { source, loads } = fakeSource()
    render(<Harness source={source} />)
    await act(async () => nth(loads, 0).resolve([]))

    fireEvent.click(screen.getByRole("button", { name: defaultLabels.newEvent }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    fireEvent.keyDown(document, { key: "Escape" })

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
