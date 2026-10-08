import { describe, expect, it } from "vitest"
import { consumerSource } from "./consumerSource"

describe("consumerSource", () => {
  it("swaps the checkout alias for the package name, in value and type imports alike", () => {
    const source = 'import { Calendar } from "@/index"\nimport type { CalendarEvent } from "@/index"\n'
    expect(consumerSource(source)).toBe(
      'import { Calendar } from "@hojiakbar_dev/calendar"\nimport type { CalendarEvent } from "@hojiakbar_dev/calendar"\n',
    )
  })

  it("leaves the example's neighbours alone", () => {
    const source = 'import { createMemorySource } from "./memorySource"'
    expect(consumerSource(source)).toBe(source)
  })
})
