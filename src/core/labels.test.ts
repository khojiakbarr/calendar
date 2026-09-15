import { describe, it, expect } from "vitest"
import { fill } from "./labels"

describe("fill", () => {
  it("replaces a single placeholder", () => {
    const result = fill("Week {n}", { n: 11 })
    expect(result).toBe("Week 11")
  })

  it("replaces repeated placeholders with the same key", () => {
    const result = fill("From {time} to {time}", { time: "9:00" })
    expect(result).toBe("From 9:00 to 9:00")
  })

  it("leaves missing keys as-is", () => {
    const result = fill("{name} at {location}", { name: "Meeting" })
    expect(result).toBe("Meeting at {location}")
  })
})
