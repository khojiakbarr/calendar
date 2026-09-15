import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { createMockServer, demoResources, seedEvents } from "./mockServer"
import { addDays, withMinutesOfDay } from "../core/date"

describe("mockServer", () => {
  describe("demoResources", () => {
    it("exports three resources with id, name, and color", () => {
      expect(demoResources).toHaveLength(3)
      expect(demoResources[0]).toEqual({ id: "team", name: "Bryntum team", color: "#3b82f6" })
      expect(demoResources[1]).toEqual({ id: "hotel", name: "Hotel Park", color: "#f59e0b" })
      expect(demoResources[2]).toEqual({ id: "michael", name: "Michael Johnson", color: "#ef4444" })
    })
  })

  describe("createMockServer", () => {
    let server: ReturnType<typeof createMockServer>
    let abortController: AbortController

    beforeEach(() => {
      vi.useFakeTimers()
      abortController = new AbortController()
      server = createMockServer({ latencyMs: 50, seed: new Date("2022-03-15") })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("load returns only events that overlap the requested range", async () => {
      const start = new Date("2022-03-14")
      const end = addDays(start, 1)

      const promise = server.load({ start, end }, { signal: abortController.signal })
      vi.advanceTimersByTime(50)

      const events = await promise
      // All events should overlap [start, end)
      events.forEach((ev) => {
        expect(ev.start.getTime() < end.getTime()).toBe(true)
        expect(ev.end.getTime() > start.getTime()).toBe(true)
      })
    })

    it("load returns fresh copies; mutating a result does not change the server state", async () => {
      const start = new Date("2022-03-14")
      const end = addDays(start, 1)

      const promise1 = server.load({ start, end }, { signal: abortController.signal })
      vi.advanceTimersByTime(50)
      const events1 = await promise1

      expect(events1.length).toBeGreaterThan(0)
      const firstEvent = events1[0]!
      const originalName = firstEvent.name

      // Mutate the returned event
      firstEvent.name = "HACKED"

      // Load again and verify the server's copy is unchanged
      const promise2 = server.load({ start, end }, { signal: abortController.signal })
      vi.advanceTimersByTime(50)
      const events2 = await promise2

      const foundEvent = events2.find((ev) => ev.id === firstEvent.id)
      expect(foundEvent?.name).toBe(originalName)
    })

    it("create assigns an id and later loads include it", async () => {
      const start = withMinutesOfDay(new Date("2022-03-20"), 10 * 60)
      const end = withMinutesOfDay(new Date("2022-03-20"), 11 * 60)

      const createPromise = server.create!({
        name: "New Meeting",
        start,
        end,
        resourceId: "team",
      })
      vi.advanceTimersByTime(50)
      const created = await createPromise

      expect(created.id).toMatch(/^ev-\d+$/)
      expect(created.name).toBe("New Meeting")

      // Load the range and verify it's included
      const loadPromise = server.load({ start: addDays(start, -1), end: addDays(start, 1) }, { signal: abortController.signal })
      vi.advanceTimersByTime(50)
      const events = await loadPromise

      const found = events.find((ev) => ev.id === created.id)
      expect(found).toBeDefined()
      expect(found?.name).toBe("New Meeting")
    })

    it("update patches an event", async () => {
      const events = server.events()
      expect(events.length).toBeGreaterThan(0)

      const targetId = events[0]!.id
      const targetEvent = events[0]!

      const updatePromise = server.update!(
        targetId,
        { name: "Updated Name" },
        targetEvent,
      )
      vi.advanceTimersByTime(50)
      const updated = await updatePromise

      expect(updated.name).toBe("Updated Name")
      expect(updated.id).toBe(targetId)

      // Verify the server's state changed
      const newState = server.events()
      const found = newState.find((ev) => ev.id === targetId)
      expect(found?.name).toBe("Updated Name")
    })

    it("remove deletes an event", async () => {
      const events = server.events()
      const targetId = events[0]!.id

      const removePromise = server.remove!(targetId)
      vi.advanceTimersByTime(50)
      await removePromise

      const afterRemove = server.events()
      expect(afterRemove.find((ev) => ev.id === targetId)).toBeUndefined()
    })

    it("failNext causes rejection and state remains unchanged", async () => {
      const events = server.events()
      const initialCount = events.length

      const server2 = createMockServer({
        latencyMs: 50,
        failNext: () => true,
      })

      const removePromise = server2.remove!(events[0]!.id)
      vi.advanceTimersByTime(50)

      await expect(removePromise).rejects.toThrow("Simulated server failure")

      const afterFailure = server2.events()
      expect(afterFailure).toHaveLength(initialCount)
    })

    it("abort signal causes rejection with AbortError", async () => {
      const start = new Date("2022-03-14")
      const end = addDays(start, 1)

      abortController.abort()

      const promise = server.load({ start, end }, { signal: abortController.signal })
      vi.advanceTimersByTime(50)

      await expect(promise).rejects.toThrow("AbortError")
    })

    it("abort signal during load (after starting) causes rejection", async () => {
      const start = new Date("2022-03-14")
      const end = addDays(start, 1)

      const promise = server.load({ start, end }, { signal: abortController.signal })

      // Abort after a small delay but before the operation completes
      vi.advanceTimersByTime(25)
      abortController.abort()

      vi.advanceTimersByTime(50)

      await expect(promise).rejects.toThrow("AbortError")
    })

    it("onLog receives entries for each operation", async () => {
      const logs: any[] = []
      const server3 = createMockServer({
        latencyMs: 50,
        onLog: (entry) => logs.push(entry),
        seed: new Date("2022-03-15"),
      })

      const ac = new AbortController()
      const loadPromise = server3.load({ start: new Date("2022-03-14"), end: new Date("2022-03-16") }, { signal: ac.signal })
      vi.advanceTimersByTime(50)
      await loadPromise

      expect(logs).toContainEqual(
        expect.objectContaining({
          method: "load",
          detail: expect.stringContaining("events"),
        }),
      )
    })
  })

  describe("seedEvents", () => {
    it("returns deterministic events seeded around an anchor date", () => {
      const anchor = new Date("2022-03-15")
      const events1 = seedEvents(anchor)
      const events2 = seedEvents(anchor)

      expect(events1).toHaveLength(events2.length)
      events1.forEach((ev, i) => {
        expect(ev.id).toBe(events2[i]!.id)
        expect(ev.name).toBe(events2[i]!.name)
        expect(ev.start.getTime()).toBe(events2[i]!.start.getTime())
      })
    })

    it("includes recurring breakfast, lunch, dinner on weekdays", () => {
      const anchor = new Date("2022-03-15") // Tuesday
      const events = seedEvents(anchor)

      const breakfasts = events.filter((ev) => ev.name === "Breakfast")
      expect(breakfasts.length).toBeGreaterThan(0)
      breakfasts.forEach((ev) => {
        expect(ev.resourceId).toBe("hotel")
        // Check time is 9:00–10:00
        expect(ev.start.getHours()).toBe(9)
        expect(ev.end.getHours()).toBe(10)
      })
    })

    it("includes Hackathon as all-day in anchor week", () => {
      const anchor = new Date("2022-03-15")
      const events = seedEvents(anchor)

      const hackathons = events.filter((ev) => ev.name === "Hackathon")
      expect(hackathons.length).toBeGreaterThan(0)
      hackathons.forEach((ev) => {
        expect(ev.allDay).toBe(true)
        expect(ev.resourceId).toBe("team")
      })
    })

    it("includes Weekly sync in other weeks", () => {
      const anchor = new Date("2022-03-15")
      const events = seedEvents(anchor)

      const syncs = events.filter((ev) => ev.name === "Weekly sync")
      expect(syncs.length).toBeGreaterThan(0)
      syncs.forEach((ev) => {
        expect(ev.resourceId).toBe("team")
        expect(ev.start.getHours()).toBe(11)
        expect(ev.end.getHours()).toBe(12)
      })
    })
  })
})
