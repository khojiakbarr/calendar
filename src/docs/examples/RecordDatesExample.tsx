import { Calendar, addDays, startOfDay, startOfWeek, useCalendar, type CalendarEvent, type CalendarResource } from "@/index"
import { createMemorySource } from "./memorySource"

const monday = startOfWeek(startOfDay(new Date()), 1)
const resources: CalendarResource[] = [
  { id: "tender", name: "Tender", color: "#8b5cf6" },
  { id: "permits", name: "Permits", color: "#0d9488" },
]

/** One record's dates, all carrying its `groupId`, so pointing at one lights the rest. */
function record(groupId: string, name: string, firstDay: number, resourceId: string): CalendarEvent[] {
  const day = (offset: number): Date => addDays(monday, firstDay + offset)
  const shared = { groupId, resourceId, allDay: true as const }
  return [
    { ...shared, id: `${groupId}:plan`, name: `${name} · plan`, start: day(0), end: day(3), appearance: "plan" },
    { ...shared, id: `${groupId}:due`, name: `${name} · due`, start: day(2), end: day(3), marker: "tick" },
    { ...shared, id: `${groupId}:paid`, name: `${name} · paid`, start: day(9), end: day(10), marker: "dot", tone: "success" },
  ]
}

const source = createMemorySource([...record("tender", "Tender", 0, "tender"), ...record("permits", "Permits", 4, "permits")])

/** Point at any date of a record, in the week or the month, and the others get an outline. */
export function RecordDatesExample() {
  const calendar = useCalendar({ id: "docs-record", source, resources, initialView: "month" })
  return <Calendar instance={calendar} sidebar={false} height={560} />
}
