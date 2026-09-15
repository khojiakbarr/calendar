import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { defaultLabels } from "./labels"
import { EventEditor } from "./EventEditor"
import type { CalendarResource, EventDraft } from "../types"

interface Fixture {
  note: string
}

const resources: CalendarResource[] = [
  { id: "r1", name: "Team A", color: "#3b82f6" },
  { id: "r2", name: "Team B", color: "#10b981" },
]

const initial: EventDraft<Fixture> = {
  name: "Standup",
  start: new Date(2022, 2, 15, 9, 0),
  end: new Date(2022, 2, 15, 9, 30),
  resourceId: "r1",
  data: { note: "x" },
}

const noop = () => {
  // intentionally empty: passed where a test does not assert the callback
}

/** `items[index]`, narrowed past `noUncheckedIndexedAccess` — fails loudly instead of silently passing `undefined` to a DOM API. */
function nth<T>(items: readonly T[], index: number): T {
  const item = items[index]
  if (item === undefined) throw new Error(`Expected an element at index ${index}, got ${items.length} elements`)
  return item
}

describe("EventEditor", () => {
  it("prefills name, dates and times from initial", () => {
    render(
      <EventEditor
        mode="edit"
        initial={initial}
        resources={resources}
        labels={defaultLabels}
        locale="en-US"
        canRemove={true}
        isPending={false}
        onSave={noop}
        onRemove={noop}
        onCancel={noop}
      />,
    )

    expect(screen.getByLabelText(defaultLabels.name)).toHaveValue("Standup")
    const [startDate, startTime] = screen.getAllByLabelText(defaultLabels.start)
    const [endDate, endTime] = screen.getAllByLabelText(defaultLabels.end)
    expect(startDate).toHaveValue("2022-03-15")
    expect(startTime).toHaveValue("09:00")
    expect(endDate).toHaveValue("2022-03-15")
    expect(endTime).toHaveValue("09:30")
  })

  it("emits the edited draft, with parsed dates, on save", () => {
    const onSave = vi.fn()
    render(
      <EventEditor
        mode="edit"
        initial={initial}
        resources={resources}
        labels={defaultLabels}
        locale="en-US"
        canRemove={false}
        isPending={false}
        onSave={onSave}
        onRemove={noop}
        onCancel={noop}
      />,
    )

    fireEvent.change(screen.getByLabelText(defaultLabels.name), { target: { value: "Planning" } })
    fireEvent.click(screen.getByRole("button", { name: defaultLabels.save }))

    expect(onSave).toHaveBeenCalledTimes(1)
    const draft = onSave.mock.calls[0]?.[0] as EventDraft<Fixture>
    expect(draft.name).toBe("Planning")
    expect(draft.start).toEqual(new Date(2022, 2, 15, 9, 0))
    expect(draft.end).toEqual(new Date(2022, 2, 15, 9, 30))
  })

  it("shows the endBeforeStart alert and does not save when end is not after start", () => {
    const onSave = vi.fn()
    render(
      <EventEditor
        mode="create"
        initial={initial}
        resources={resources}
        labels={defaultLabels}
        locale="en-US"
        canRemove={false}
        isPending={false}
        onSave={onSave}
        onRemove={noop}
        onCancel={noop}
      />,
    )

    const endTime = nth(screen.getAllByLabelText(defaultLabels.end), 1)
    fireEvent.change(endTime, { target: { value: "08:00" } }) // before the 09:00 start, same day
    fireEvent.click(screen.getByRole("button", { name: defaultLabels.save }))

    expect(screen.getByRole("alert")).toHaveTextContent(defaultLabels.endBeforeStart)
    expect(onSave).not.toHaveBeenCalled()
  })

  it("hides the time inputs when All day is on, and saves an exclusive next-midnight end", () => {
    const onSave = vi.fn()
    render(
      <EventEditor
        mode="edit"
        initial={initial}
        resources={resources}
        labels={defaultLabels}
        locale="en-US"
        canRemove={false}
        isPending={false}
        onSave={onSave}
        onRemove={noop}
        onCancel={noop}
      />,
    )

    expect(screen.getAllByLabelText(defaultLabels.start)).toHaveLength(2)

    fireEvent.click(screen.getByLabelText(defaultLabels.allDay))

    expect(screen.getAllByLabelText(defaultLabels.start)).toHaveLength(1)
    expect(screen.getAllByLabelText(defaultLabels.end)).toHaveLength(1)

    fireEvent.click(screen.getByRole("button", { name: defaultLabels.save }))

    expect(onSave).toHaveBeenCalledTimes(1)
    const draft = onSave.mock.calls[0]?.[0] as EventDraft<Fixture>
    expect(draft.allDay).toBe(true)
    expect(draft.start).toEqual(new Date(2022, 2, 15, 0, 0))
    expect(draft.end).toEqual(new Date(2022, 2, 16, 0, 0)) // exclusive next midnight
  })

  it("shows Delete only when mode is edit and canRemove is true, and wires it to onRemove", () => {
    const onRemove = vi.fn()
    const { rerender } = render(
      <EventEditor
        mode="create"
        initial={initial}
        resources={resources}
        labels={defaultLabels}
        locale="en-US"
        canRemove={true}
        isPending={false}
        onSave={noop}
        onRemove={onRemove}
        onCancel={noop}
      />,
    )
    expect(screen.queryByRole("button", { name: defaultLabels.delete })).toBeNull()

    rerender(
      <EventEditor
        mode="edit"
        initial={initial}
        resources={resources}
        labels={defaultLabels}
        locale="en-US"
        canRemove={false}
        isPending={false}
        onSave={noop}
        onRemove={onRemove}
        onCancel={noop}
      />,
    )
    expect(screen.queryByRole("button", { name: defaultLabels.delete })).toBeNull()

    rerender(
      <EventEditor
        mode="edit"
        initial={initial}
        resources={resources}
        labels={defaultLabels}
        locale="en-US"
        canRemove={true}
        isPending={false}
        onSave={noop}
        onRemove={onRemove}
        onCancel={noop}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: defaultLabels.delete }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it("calls onCancel when Cancel is clicked", () => {
    const onCancel = vi.fn()
    render(
      <EventEditor
        mode="create"
        initial={initial}
        resources={resources}
        labels={defaultLabels}
        locale="en-US"
        canRemove={false}
        isPending={false}
        onSave={noop}
        onRemove={noop}
        onCancel={onCancel}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: defaultLabels.cancel }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("stacks the footer buttons Save, Cancel, Delete in sheet presentation", () => {
    render(
      <EventEditor
        mode="edit"
        initial={initial}
        resources={resources}
        labels={defaultLabels}
        locale="en-US"
        presentation="sheet"
        canRemove={true}
        isPending={false}
        onSave={noop}
        onRemove={noop}
        onCancel={noop}
      />,
    )

    const actions = document.body.querySelector(".cal-editor-actions")
    const buttonLabels = Array.from(actions?.querySelectorAll("button") ?? []).map((button) => button.textContent)

    expect(buttonLabels).toEqual([defaultLabels.save, defaultLabels.cancel, defaultLabels.delete])
  })

  it("keeps the footer buttons Delete, Cancel, Save in modal presentation", () => {
    render(
      <EventEditor
        mode="edit"
        initial={initial}
        resources={resources}
        labels={defaultLabels}
        locale="en-US"
        presentation="modal"
        canRemove={true}
        isPending={false}
        onSave={noop}
        onRemove={noop}
        onCancel={noop}
      />,
    )

    const actions = document.body.querySelector(".cal-editor-actions")
    const buttonLabels = Array.from(actions?.querySelectorAll("button") ?? []).map((button) => button.textContent)

    expect(buttonLabels).toEqual([defaultLabels.delete, defaultLabels.cancel, defaultLabels.save])
  })

  it("disables Save and shows the saving label while isPending", () => {
    render(
      <EventEditor
        mode="edit"
        initial={initial}
        resources={resources}
        labels={defaultLabels}
        locale="en-US"
        canRemove={false}
        isPending={true}
        onSave={noop}
        onRemove={noop}
        onCancel={noop}
      />,
    )

    expect(screen.getByRole("button", { name: defaultLabels.saving })).toBeDisabled()
  })
})
