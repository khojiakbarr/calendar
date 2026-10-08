import { act, render, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Calendar } from "./components/Calendar"
import type { EventSource } from "./types"
import { useCalendar } from "./useCalendar"

/** A day far from the machine's today, so a pass cannot be the browser's clock by luck. */
const NOW = new Date(2031, 4, 14, 10, 30)
const host = { now: () => NOW }
const EMPTY: EventSource = { load: async () => [] }

describe("the host's clock", () => {
  it("anchors on the host's now and «Today» returns to it", () => {
    const { result } = renderHook(() => useCalendar({ id: "now", source: EMPTY, now: host.now }))
    expect(result.current.date.getTime()).toBe(NOW.getTime())
    act(() => result.current.goNext())
    expect(result.current.date.getTime()).not.toBe(NOW.getTime())
    act(() => result.current.goToday())
    expect(result.current.date.getTime()).toBe(NOW.getTime())
  })

  it("marks the host's today in the month grid", () => {
    function Harness() {
      const instance = useCalendar({ id: "now-month", source: EMPTY, now: host.now, initialView: "month" })
      return <Calendar instance={instance} />
    }
    const { container } = render(<Harness />)
    expect(container.querySelector('[data-day="2031-05-14"] .cal-month-today')).not.toBeNull()
  })
})
