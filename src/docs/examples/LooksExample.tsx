import { Calendar, addDays, startOfDay, startOfWeek, useCalendar, type CalendarEvent } from "@/index"
import { createMemorySource } from "./memorySource"

const monday = startOfWeek(startOfDay(new Date()), 1)
const day = (offset: number): Date => addDays(monday, offset)

/**
 * One project step, as a Gantt chart draws it: planned for Monday and Tuesday,
 * worked on those days, late by two more, due on Tuesday, paid on Friday.
 */
const step: CalendarEvent[] = [
  { id: "step:plan", name: "Procurement · plan", start: day(0), end: day(2), allDay: true, appearance: "plan" },
  { id: "step:actual", name: "Procurement · actual", start: day(0), end: day(2), allDay: true, appearance: "actual" },
  { id: "step:late", name: "Procurement · overrun", start: day(2), end: day(4), allDay: true, appearance: "overrun" },
  { id: "step:due", name: "Procurement · due", start: day(1), end: day(2), allDay: true, marker: "tick", tone: "danger" },
  { id: "step:paid", name: "Procurement · paid", start: day(4), end: day(5), allDay: true, marker: "dot", tone: "success" },
]
const source = createMemorySource(step)

/** A plan, the work, its overrun, a deadline tick and a payment dot, each drawn for what it is. */
export function LooksExample() {
  const calendar = useCalendar({ id: "docs-looks", source, initialView: "week" })
  return <Calendar instance={calendar} sidebar={false} height={330} />
}
