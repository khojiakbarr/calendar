import { Calendar, addDays, addMinutes, startOfDay, useCalendar, type CalendarEvent, type CalendarResource } from "@/index"
import { createMemorySource } from "./memorySource"

const resources: CalendarResource[] = [
  { id: "front-desk", name: "Front desk", color: "#64748b" },
  { id: "dr-lee", name: "Dr. Lee", color: "#3b82f6", group: "Doctors" },
  { id: "dr-osei", name: "Dr. Osei", color: "#f59e0b", group: "Doctors" },
  { id: "room-1", name: "Room 1", color: "#10b981", group: "Rooms" },
  { id: "room-2", name: "Room 2", color: "#ec4899", group: "Rooms" },
]
const DOCTORS = ["dr-lee", "dr-osei"]

const today = startOfDay(new Date())
const booking = (id: string, name: string, resourceId: string, dayOffset: number, hour: number): CalendarEvent => {
  const start = addMinutes(addDays(today, dayOffset), hour * 60)
  return { id, name, resourceId, start, end: addMinutes(start, 60) }
}
const source = createMemorySource([
  booking("1", "Check-up", "dr-lee", 0, 9),
  booking("2", "Follow-up", "dr-osei", 0, 11),
  booking("3", "Minor procedure", "room-1", 0, 13),
  booking("4", "Cleaning", "room-2", 1, 8),
  booking("5", "Opening", "front-desk", 1, 9),
])

/** Resources with a `group` get a heading and a checkbox of their own in the sidebar. */
export function ResourcesExample() {
  const calendar = useCalendar({ id: "docs-resources", source, resources, initialView: "week" })

  return (
    <>
      <div className="docs-actions">
        <button type="button" onClick={() => calendar.setResourcesHidden(DOCTORS, true)}>
          Hide the doctors
        </button>
        <button type="button" onClick={() => calendar.setResourcesHidden(DOCTORS, false)}>
          Show the doctors
        </button>
      </div>
      <Calendar instance={calendar} height={640} />
    </>
  )
}
