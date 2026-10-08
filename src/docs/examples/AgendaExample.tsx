import { useState } from "react"
import { Calendar, addDays, addMinutes, startOfDay, useCalendar, type CalendarEvent } from "@/index"
import { createMemorySource } from "./memorySource"

const today = startOfDay(new Date())
const events: CalendarEvent[] = [
  { id: "plan", name: "Site works · plan", start: addDays(today, -3), end: addDays(today, 12), allDay: true, appearance: "plan" },
  ...[0, 2, 5, 8].map((offset) => ({
    id: `review-${offset}`,
    name: "Progress review",
    start: addMinutes(addDays(today, offset), 10 * 60),
    end: addMinutes(addDays(today, offset), 11 * 60),
  })),
]
const source = createMemorySource(events)

/** The agenda opens on today; a long plan is listed under every day, or once, under the first. */
export function AgendaExample() {
  const [agendaSpans, setAgendaSpans] = useState<"each" | "first">("first")
  const calendar = useCalendar({ id: "docs-agenda", source, initialView: "agenda", agendaSpans })

  return (
    <>
      <label className="docs-toggle">
        agendaSpans
        <select value={agendaSpans} onChange={(event) => setAgendaSpans(event.target.value === "each" ? "each" : "first")}>
          <option>first</option>
          <option>each</option>
        </select>
      </label>
      <Calendar instance={calendar} sidebar={false} height={360} />
    </>
  )
}
