import { useMemo, useRef, useState } from "react"
import { Calendar, addDays, addMinutes, startOfDay, useCalendar, type CalendarEvent, type EventSourceAction } from "@/index"
import { createMemorySource } from "./memorySource"

const today = startOfDay(new Date())
const meeting = (id: string, name: string, dayOffset: number, hour: number): CalendarEvent => {
  const start = addMinutes(addDays(today, dayOffset), hour * 60)
  return { id, name, start, end: addMinutes(start, 60) }
}

/** An edit shows at once; if the source refuses, the calendar puts the event back and says why. */
export function OptimisticExample() {
  const [isRefusing, setIsRefusing] = useState(false)
  const [note, setNote] = useState("Drag an event, then tick the box and drag another.")
  const isRefusingRef = useRef(false)
  const source = useMemo(
    () =>
      createMemorySource([meeting("a", "Review", 0, 10), meeting("b", "Planning", 1, 13)], {
        latencyMs: 900,
        shouldFail: (action) => action !== "load" && isRefusingRef.current,
      }),
    [],
  )
  const calendar = useCalendar({
    id: "docs-optimistic",
    source,
    onError: (_error: unknown, action: EventSourceAction) => setNote(`The ${action} was refused, so the calendar rolled it back.`),
  })

  const handleRefuse = (checked: boolean) => {
    isRefusingRef.current = checked
    setIsRefusing(checked)
  }

  return (
    <>
      <label className="docs-toggle">
        <input type="checkbox" checked={isRefusing} onChange={(event) => handleRefuse(event.target.checked)} />
        The server refuses edits
      </label>
      <Calendar instance={calendar} sidebar={false} height={340} />
      <p className="docs-live-note" role="status">
        {note}
      </p>
    </>
  )
}
