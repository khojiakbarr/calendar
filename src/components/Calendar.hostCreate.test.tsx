import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { CalendarEvent, EventDraft, EventSource } from "../types"
import { useCalendar } from "../useCalendar"
import type { AnchorRect } from "./Popover"
import { Calendar } from "./Calendar"
import { defaultLabels } from "./labels"

/** A read-only source: it loads and cannot create — as a host that makes its records elsewhere has. */
function readOnlySource(): { source: EventSource; settle: (events: CalendarEvent[]) => void } {
  let settle: (events: CalendarEvent[]) => void = () => undefined
  const source: EventSource = {
    load: () =>
      new Promise((resolve) => {
        settle = resolve
      }),
  }
  return { source, settle: (events) => settle(events) }
}

function Harness({ source, onCreateRequest }: { source: EventSource; onCreateRequest?: (draft: EventDraft, anchor: AnchorRect | null) => void }) {
  const instance = useCalendar({ id: "host-create", source, initialDate: new Date(2022, 2, 15), initialView: "week", locale: "en-US" })
  return <Calendar instance={instance} {...(onCreateRequest ? { onCreateRequest } : {})} />
}

describe("Calendar with a host that makes its own records", () => {
  it("offers New event though the source cannot create, and hands the draft to the host instead of opening the editor", async () => {
    const { source, settle } = readOnlySource()
    const onCreateRequest = vi.fn()
    render(<Harness source={source} onCreateRequest={onCreateRequest} />)
    await act(async () => settle([]))

    fireEvent.click(screen.getByRole("button", { name: defaultLabels.newEvent }))

    expect(onCreateRequest).toHaveBeenCalledTimes(1)
    const [draft, anchor] = onCreateRequest.mock.calls[0] ?? []
    expect((draft as EventDraft).start).toBeInstanceOf(Date)
    expect(anchor).toBeNull()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("offers no New event to a read-only calendar whose host does not create", async () => {
    const { source, settle } = readOnlySource()
    render(<Harness source={source} />)
    await act(async () => settle([]))
    expect(screen.queryByRole("button", { name: defaultLabels.newEvent })).not.toBeInTheDocument()
  })
})

describe("Calendar keeping its sidebar's folding for a host", () => {
  function Folded({ collapsed, onChange }: { collapsed: string[]; onChange: (groups: string[]) => void }) {
    const instance = useCalendar({
      id: "folding",
      source: { load: async () => [] },
      resources: [{ id: "a", name: "A", color: "red", group: "Group" }],
      initialDate: new Date(2022, 2, 15),
      locale: "en-US",
    })
    return <Calendar instance={instance} collapsedGroups={collapsed} onCollapsedGroupsChange={onChange} />
  }

  it("draws a group the host keeps folded as folded, and tells it an open", () => {
    const onChange = vi.fn()
    render(<Folded collapsed={["Group"]} onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "Expand Group" }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
