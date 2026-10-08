import { useMemo, useState } from "react"
import { Calendar, addMinutes, startOfDay, useCalendar, type CalendarEvent } from "@/index"
import { createMemorySource } from "./memorySource"

const ZONES = ["Asia/Tashkent", "Europe/London", "America/Los_Angeles"]

/**
 * A Date whose LOCAL fields read `timeZone`'s wall clock, which is what the
 * calendar means by "now" (it reads every event's fields the same way).
 */
function toWallClock(instant: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(instant)
  const field = (type: string): number => Number(parts.find((part) => part.type === type)?.value)
  return new Date(field("year"), field("month") - 1, field("day"), field("hour"), field("minute"), field("second"))
}

/** A calendar that thinks it is in `zone`: its today, now-line and «Today» follow that clock. */
function ZoneCalendar({ zone, onOpen }: { zone: string; onOpen: (event: CalendarEvent) => void }) {
  const source = useMemo(() => {
    const today = startOfDay(toWallClock(new Date(), zone))
    const at = (hour: number, name: string): CalendarEvent => ({
      id: name, name, start: addMinutes(today, hour * 60), end: addMinutes(today, hour * 60 + 60),
    })
    return createMemorySource([at(9, "Stand-up"), at(13, "Lunch"), at(16, "Review")])
  }, [zone])
  const calendar = useCalendar({ id: `docs-clock-${zone}`, source, initialView: "day", now: () => toWallClock(new Date(), zone) })
  return <Calendar instance={calendar} sidebar={false} height={360} onEventClick={onOpen} />
}

/** The host decides what time it is, and what a click on an event does. */
export function ClockAndClickExample() {
  const [zone, setZone] = useState(ZONES[0] ?? "UTC")
  const [opened, setOpened] = useState("Click an event: the host opens it, not the calendar.")

  return (
    <>
      <label className="docs-toggle">
        The clock runs in
        <select value={zone} onChange={(event) => setZone(event.target.value)}>
          {ZONES.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <ZoneCalendar key={zone} zone={zone} onOpen={(event) => setOpened(`Opened "${event.name}" in the host's own page.`)} />
      <p className="docs-live-note" role="status">
        {opened}
      </p>
    </>
  )
}
