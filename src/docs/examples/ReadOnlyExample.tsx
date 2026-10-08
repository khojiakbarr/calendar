import { Calendar, addDays, addMinutes, startOfDay, useCalendar, type EventSource } from "@/index"
import { createMemorySource } from "./memorySource"

const start = addMinutes(addDays(startOfDay(new Date()), 1), 10 * 60)
const memory = createMemorySource([{ id: "holiday", name: "Public holiday", start, end: addMinutes(start, 480) }])

/** Only `load`: the calendar offers no drag, no resize, no "New event" and no editor. */
const source: EventSource = { load: (range, options) => memory.load(range, options) }

/** A feed the user can read but not change. */
export function ReadOnlyExample() {
  const calendar = useCalendar({ id: "docs-read-only", source })
  return <Calendar instance={calendar} sidebar={false} height={300} />
}
