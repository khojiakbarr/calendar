import { describe, expect, it } from "vitest"
import type { CalendarEvent } from "../types"
import { eventLookClasses, TONE_COLOR, toneOf } from "./looks"

const base: CalendarEvent = { id: "e", name: "E", start: new Date(2031, 0, 1), end: new Date(2031, 0, 2) }

describe("event looks", () => {
  it("names the look, the marker and the host's own class", () => {
    expect(eventLookClasses({ ...base, appearance: "plan" })).toBe("cal-look-plan")
    expect(eventLookClasses({ ...base, marker: "tick", className: "x-review" })).toBe("cal-marker cal-marker-tick x-review")
    expect(eventLookClasses(base)).toBe("")
  })

  it("reads an overrun as danger unless it says otherwise", () => {
    expect(toneOf({ ...base, appearance: "overrun" })).toBe("danger")
    expect(toneOf({ ...base, appearance: "overrun", tone: "neutral" })).toBe("neutral")
    expect(toneOf(base)).toBeUndefined()
    expect(TONE_COLOR.success).toBe("var(--cal-success)")
  })
})
