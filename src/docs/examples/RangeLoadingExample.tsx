import { useMemo, useState } from "react"
import { Calendar, addDays, addMinutes, startOfDay, useCalendar, type CalendarEvent } from "@/index"
import { createMemorySource } from "./memorySource"

/** A weekly stand-up for the next five weeks, so every range has something in it. */
const standups: CalendarEvent[] = Array.from({ length: 10 }, (_, week) => {
  const start = addMinutes(addDays(startOfDay(new Date()), week * 7 - 14), 9 * 60)
  return { id: `standup-${week}`, name: "Stand-up", start, end: addMinutes(start, 30) }
})

/** The calendar asks the source for a range, and not again for one it already holds. */
export function RangeLoadingExample() {
  const [requests, setRequests] = useState<string[]>([])
  const source = useMemo(
    () => createMemorySource(standups, { onRequest: (line) => setRequests((lines) => [line, ...lines].slice(0, 4)) }),
    [],
  )
  const calendar = useCalendar({ id: "docs-range", source, initialView: "week" })

  return (
    <>
      <Calendar instance={calendar} sidebar={false} height={340} />
      <ol className="docs-traffic" aria-label="Requests the calendar made">
        {requests.map((line, index) => (
          <li key={`${index}-${line}`}>{line}</li>
        ))}
      </ol>
    </>
  )
}
