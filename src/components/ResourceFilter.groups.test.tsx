import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { CalendarResource, EventSource } from "../types"
import { useCalendar } from "../useCalendar"
import { defaultLabels } from "./labels"
import { ResourceFilter } from "./ResourceFilter"

const RESOURCES: CalendarResource[] = [
  { id: "document:deadline", name: "Срок", color: "red", group: "Документы" },
  { id: "document:date", name: "Дата документа", color: "blue", group: "Документы" },
  { id: "task:due", name: "Срок задачи", color: "green", group: "Задачи" },
]
const EMPTY: EventSource = { load: async () => [] }

function Filter() {
  const instance = useCalendar({ id: "groups", source: EMPTY, resources: RESOURCES })
  return (
    <>
      <ResourceFilter instance={instance} labels={defaultLabels} />
      <output data-testid="hidden">{[...instance.hiddenResourceIds].sort().join(",")}</output>
    </>
  )
}

describe("grouped resources", () => {
  it("files each resource under its group's checkbox", () => {
    render(<Filter />)
    expect(screen.getByRole("checkbox", { name: "Документы" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Задачи" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Дата документа" })).toBeChecked()
  })

  it("hides and shows a whole group at once", () => {
    render(<Filter />)
    fireEvent.click(screen.getByRole("checkbox", { name: "Документы" }))
    expect(screen.getByTestId("hidden")).toHaveTextContent("document:date,document:deadline")
    fireEvent.click(screen.getByRole("checkbox", { name: "Документы" }))
    expect(screen.getByTestId("hidden")).toHaveTextContent("")
  })

  it("reads a partly hidden group as mixed", () => {
    render(<Filter />)
    fireEvent.click(screen.getByRole("checkbox", { name: "Срок" }))
    const group = screen.getByRole<HTMLInputElement>("checkbox", { name: "Документы" })
    expect(group.indeterminate).toBe(true)
    expect(group).not.toBeChecked()
  })
})
