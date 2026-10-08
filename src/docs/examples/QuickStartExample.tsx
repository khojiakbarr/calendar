import { Calendar, addDays, addMinutes, startOfDay, useCalendar, type CalendarEvent, type CalendarResource } from "@/index"
import { createMemorySource } from "./memorySource"

const resources: CalendarResource[] = [
  { id: "dr-lee", name: "Dr. Lee", color: "#3b82f6" },
  { id: "dr-osei", name: "Dr. Osei", color: "#f59e0b" },
]

/** An appointment `dayOffset` days from today, `hour` o'clock, 45 minutes long. */
const visit = (dayOffset: number, hour: number, name: string, resourceId: string): CalendarEvent => {
  const start = addMinutes(addDays(startOfDay(new Date()), dayOffset), hour * 60)
  return { id: `${dayOffset}-${hour}`, name, resourceId, start, end: addMinutes(start, 45) }
}

const source = createMemorySource([
  visit(0, 9, "Check-up", "dr-lee"),
  visit(0, 11, "Follow-up", "dr-osei"),
  visit(1, 10, "Vaccination", "dr-lee"),
  visit(2, 14, "Consultation", "dr-osei"),
  visit(-1, 15, "Lab results", "dr-lee"),
])

/** The smallest useful calendar: a source, two resources, the built-in shell. */
export function QuickStartExample() {
  const calendar = useCalendar({ id: "docs-quick-start", source, resources, initialView: "week" })
  return <Calendar instance={calendar} height={460} />
}
