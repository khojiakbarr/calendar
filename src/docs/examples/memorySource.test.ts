import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { CalendarEvent, EventSource } from "@/index"
import { createMemorySource } from "./memorySource"

const day = (n: number) => new Date(2026, 9, n)
const event = (id: string, from: number, to: number): CalendarEvent => ({ id, name: id, start: day(from), end: day(to) })

/** Runs `call` and lets the source's simulated latency pass. */
async function settle<T>(call: () => Promise<T>): Promise<T> {
  const pending = call()
  // Attach before time moves, or a rejection is reported as unhandled first.
  const observed = pending.then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  )
  await vi.advanceTimersByTimeAsync(1000)
  const result = await observed
  if ("error" in result) throw result.error
  return result.value
}

describe("createMemorySource", () => {
  let source: EventSource

  beforeEach(() => {
    vi.useFakeTimers()
    source = createMemorySource([event("a", 1, 2), event("b", 10, 12)], { latencyMs: 100 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("loads only what overlaps the range, the end being exclusive", async () => {
    const loaded = await settle(() => source.load({ start: day(2), end: day(10) }, { signal: new AbortController().signal }))
    expect(loaded).toEqual([])

    const wider = await settle(() => source.load({ start: day(1), end: day(11) }, { signal: new AbortController().signal }))
    expect(wider.map((found) => found.id)).toEqual(["a", "b"])
  })

  it("rejects a load whose signal was aborted while it waited", async () => {
    const controller = new AbortController()
    const pending = source.load({ start: day(1), end: day(30) }, { signal: controller.signal })
    const observed = pending.then(
      () => "resolved",
      // jsdom's DOMException is not the global one, so match on the name rather than the class.
      (error: unknown) => (typeof error === "object" && error !== null && "name" in error ? String(error.name) : "other"),
    )
    controller.abort()
    await vi.advanceTimersByTimeAsync(1000)
    expect(await observed).toBe("AbortError")
  })

  it("creates, updates and removes", async () => {
    const created = await settle(() => source.create!({ name: "New", start: day(5), end: day(6) }))
    expect(created.id).toBe("new-1")

    const updated = await settle(() => source.update!(created.id, { name: "Renamed" }, created))
    expect(updated.name).toBe("Renamed")

    await settle(() => source.remove!(created.id))
    const loaded = await settle(() => source.load({ start: day(5), end: day(6) }, { signal: new AbortController().signal }))
    expect(loaded).toEqual([])
  })

  it("refuses a call when shouldFail says so, naming the action it was asked about", async () => {
    const asked: string[] = []
    const refusing = createMemorySource([], {
      latencyMs: 10,
      shouldFail: (action) => {
        asked.push(action)
        return action === "create"
      },
    })

    await expect(settle(() => refusing.create!({ name: "x", start: day(1), end: day(2) }))).rejects.toThrow("refused")
    await settle(() => refusing.load({ start: day(1), end: day(2) }, { signal: new AbortController().signal }))
    expect(asked).toEqual(["create", "load"])
  })

  it("tells onRequest one line per call", async () => {
    const lines: string[] = []
    const logged = createMemorySource([], { latencyMs: 10, onRequest: (line) => lines.push(line) })
    await settle(() => logged.remove!("x"))
    expect(lines).toEqual(["remove x"])
  })
})
