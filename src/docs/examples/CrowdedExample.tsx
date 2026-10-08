import { useState } from "react"
import { Calendar, addMinutes, startOfDay, useCalendar, type CalendarEvent } from "@/index"
import { createMemorySource } from "./memorySource"

const NAMES = ["Sprint planning", "Design crit", "Data sync", "Hiring panel", "1:1 with Alex", "Vendor call"]
const nineToday = addMinutes(startOfDay(new Date()), 9 * 60)
const meetings: CalendarEvent[] = NAMES.map((name, index) => ({
  id: `meeting-${index}`,
  name,
  start: nineToday,
  end: addMinutes(nineToday, 60),
}))
const source = createMemorySource(meetings)

/** Six meetings at one hour: a week shows a few side by side and gathers the rest into «+N». */
export function CrowdedExample() {
  const [maxColumns, setMaxColumns] = useState(3)
  const calendar = useCalendar({ id: "docs-crowded", source, maxEventColumns: maxColumns })

  return (
    <>
      <label className="docs-toggle">
        maxEventColumns
        <select value={maxColumns} onChange={(event) => setMaxColumns(Number(event.target.value))}>
          {[2, 3, 4, 6].map((count) => (
            <option key={count}>{count}</option>
          ))}
        </select>
      </label>
      <Calendar instance={calendar} sidebar={false} height={400} />
    </>
  )
}
