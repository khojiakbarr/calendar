import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useCalendar, type UseCalendarOptions } from "./useCalendar"
import type { CalendarEvent, CalendarPreferences, DateRange, EventSource, PreferenceStorage } from "./types"

/** A promise the test settles by hand, standing in for a slow server. */
interface Deferred<T> {
  promise: Promise<T>
  resolve(value: T): void
  reject(reason: unknown): void
}

function deferred<T>(): Deferred<T> {
  const control: { resolve?: (value: T) => void; reject?: (reason: unknown) => void } = {}
  const promise = new Promise<T>((resolve, reject) => {
    control.resolve = resolve
    control.reject = reject
  })
  return { promise, resolve: (value) => control.resolve?.(value), reject: (reason) => control.reject?.(reason) }
}

/** `noUncheckedIndexedAccess`-friendly indexing that fails the test loudly. */
function nth<T>(list: readonly T[], index: number): T {
  const item = list[index]
  if (item === undefined) throw new Error(`No entry ${index} in a list of ${list.length}`)
  return item
}

interface LoadCall {
  range: DateRange
  signal: AbortSignal
  deferred: Deferred<CalendarEvent[]>
}

interface MutationCall<T> {
  args: unknown[]
  deferred: Deferred<T>
}

/** An `EventSource` whose every call hangs until the test settles it. */
function fakeSource(methods: { create?: boolean; update?: boolean; remove?: boolean } = {}) {
  const { create = true, update = true, remove = true } = methods
  const loads: LoadCall[] = []
  const creates: MutationCall<CalendarEvent>[] = []
  const updates: MutationCall<CalendarEvent>[] = []
  const removes: MutationCall<void>[] = []

  function record<T>(list: MutationCall<T>[], args: unknown[]): Promise<T> {
    const pending = deferred<T>()
    list.push({ args, deferred: pending })
    return pending.promise
  }

  const source: EventSource = {
    load(range, { signal }) {
      const pending = deferred<CalendarEvent[]>()
      loads.push({ range, signal, deferred: pending })
      return pending.promise
    },
    ...(create ? { create: (draft: unknown) => record(creates, [draft]) } : {}),
    ...(update ? { update: (...args: unknown[]) => record(updates, args) } : {}),
    ...(remove ? { remove: (id: unknown) => record(removes, [id]) } : {}),
  }

  return { source, loads, creates, updates, removes }
}

/** Tuesday 15 March 2022, the day the Bryntum demo opens on. */
const ANCHOR = new Date(2022, 2, 15)

function eventAt(id: string, name: string, day: number, resourceId?: string): CalendarEvent {
  return {
    id,
    name,
    start: new Date(2022, 2, day, 9),
    end: new Date(2022, 2, day, 10),
    ...(resourceId === undefined ? {} : { resourceId }),
  }
}

function render(options: Partial<UseCalendarOptions> & { source: EventSource }) {
  return renderHook(() => useCalendar({ id: "test", initialDate: ANCHOR, initialView: "week", ...options }))
}

afterEach(() => {
  vi.useRealTimers()
})

describe("loading", () => {
  it("asks for the visible window on mount and shows what comes back", async () => {
    const { source, loads } = fakeSource()

    const { result } = render({ source })
    expect(result.current.status).toBe("loading")
    expect(loads).toHaveLength(1)
    await act(async () => nth(loads, 0).deferred.resolve([eventAt("a", "Breakfast", 15)]))

    expect(result.current.status).toBe("idle")
    expect(result.current.events.map((event) => event.id)).toEqual(["a"])
  })

  it("does not ask again while the loaded window still covers the view", async () => {
    const { source, loads } = fakeSource()
    const { result } = render({ source, initialView: "day" })
    await act(async () => nth(loads, 0).deferred.resolve([]))

    act(() => result.current.goNext())

    expect(result.current.days.map((day) => day.getDate())).toEqual([16])
    expect(loads).toHaveLength(1)
  })

  it("asks for whole weeks when the view moves to a month it has not seen", async () => {
    const { source, loads } = fakeSource()
    const { result } = render({ source, initialView: "month" })
    await act(async () => nth(loads, 0).deferred.resolve([]))

    act(() => result.current.goNext())

    expect(loads).toHaveLength(2)
    const asked = nth(loads, 1).range
    expect(asked.start.getDay()).toBe(1)
    expect(asked.end.getDay()).toBe(1)
    expect(asked.start.getTime()).toBeLessThanOrEqual(result.current.range.start.getTime())
    expect(asked.end.getTime()).toBeGreaterThanOrEqual(result.current.range.end.getTime())
  })

  it("aborts a request the user has navigated past and ignores it if it resolves anyway", async () => {
    const { source, loads } = fakeSource()
    const { result } = render({ source })

    act(() => result.current.goPrevious())
    act(() => result.current.goNext())

    expect(loads).toHaveLength(3)
    expect(nth(loads, 1).signal.aborted).toBe(true)
    await act(async () => nth(loads, 1).deferred.resolve([eventAt("stale", "Stale", 9)]))
    expect(result.current.events).toEqual([])

    await act(async () => nth(loads, 2).deferred.resolve([eventAt("fresh", "Fresh", 15)]))
    expect(result.current.events.map((event) => event.id)).toEqual(["fresh"])
    expect(result.current.status).toBe("idle")
  })

  it("reports a failed load without clearing what is on screen", async () => {
    const onError = vi.fn()
    const { source, loads } = fakeSource()
    const failure = new Error("offline")
    const { result } = render({ source, onError })

    await act(async () => nth(loads, 0).deferred.reject(failure))

    expect(result.current.status).toBe("error")
    expect(result.current.error).toBe(failure)
    expect(onError).toHaveBeenCalledWith(failure, "load")
  })

  it("forgets every cached range and fetches again on reload", async () => {
    const { source, loads } = fakeSource()
    const { result } = render({ source })
    await act(async () => nth(loads, 0).deferred.resolve([eventAt("a", "Breakfast", 15)]))

    act(() => result.current.reload())

    expect(loads).toHaveLength(2)
    expect(result.current.events).toEqual([])
    await act(async () => nth(loads, 1).deferred.resolve([eventAt("b", "Lunch", 15)]))
    expect(result.current.events.map((event) => event.id)).toEqual(["b"])
  })
})

describe("optimistic edits", () => {
  /** A calendar showing one loaded event, "a" — the thing each edit acts on. */
  async function loaded(options: Omit<Partial<UseCalendarOptions>, "source"> = {}) {
    const fake = fakeSource()
    const view = render({ ...options, source: fake.source })
    await act(async () => nth(fake.loads, 0).deferred.resolve([eventAt("a", "Breakfast", 15)]))
    return { ...fake, ...view }
  }

  it("shows a created event at once, then swaps in the server's", async () => {
    const { result, creates } = await loaded()
    const draft = { name: "Standup", start: new Date(2022, 2, 16, 9), end: new Date(2022, 2, 16, 10) }

    let saving: Promise<CalendarEvent | null> | undefined
    act(() => {
      saving = result.current.createEvent(draft)
    })

    const optimistic = result.current.events.find((event) => event.name === "Standup")
    expect(optimistic?.id).toMatch(/^tmp:/)
    expect(result.current.pendingIds.has(optimistic?.id ?? "")).toBe(true)

    await act(async () => {
      nth(creates, 0).deferred.resolve({ ...draft, id: "server-1" })
      await saving
    })
    expect(result.current.events.map((event) => event.id)).toEqual(["a", "server-1"])
    expect(result.current.pendingIds.size).toBe(0)
  })

  it("takes the created event back when the server rejects it", async () => {
    const onError = vi.fn()
    const { result, creates } = await loaded({ onError })
    const draft = { name: "Standup", start: new Date(2022, 2, 16, 9), end: new Date(2022, 2, 16, 10) }

    let saving: Promise<CalendarEvent | null> | undefined
    act(() => {
      saving = result.current.createEvent(draft)
    })
    const failure = new Error("rejected")
    await act(async () => {
      nth(creates, 0).deferred.reject(failure)
      expect(await saving).toBeNull()
    })

    expect(result.current.events.map((event) => event.id)).toEqual(["a"])
    expect(result.current.pendingIds.size).toBe(0)
    expect(onError).toHaveBeenCalledWith(failure, "create")
  })

  it("applies a patch at once and keeps the server's answer", async () => {
    const { result, updates } = await loaded()

    let saving: Promise<CalendarEvent | null> | undefined
    act(() => {
      saving = result.current.updateEvent("a", { name: "Brunch" })
    })
    expect(result.current.events.map((event) => event.name)).toEqual(["Brunch"])
    expect(result.current.pendingIds.has("a")).toBe(true)

    await act(async () => {
      nth(updates, 0).deferred.resolve({ ...eventAt("a", "Brunch", 15), name: "Brunch (server)" })
      await saving
    })
    expect(result.current.events.map((event) => event.name)).toEqual(["Brunch (server)"])
  })

  it("restores the event it patched when the server rejects", async () => {
    const onError = vi.fn()
    const { result, updates } = await loaded({ onError })

    let saving: Promise<CalendarEvent | null> | undefined
    act(() => {
      saving = result.current.updateEvent("a", { name: "Brunch" })
    })
    const failure = new Error("rejected")
    await act(async () => {
      nth(updates, 0).deferred.reject(failure)
      expect(await saving).toBeNull()
    })

    expect(result.current.events.map((event) => event.name)).toEqual(["Breakfast"])
    expect(onError).toHaveBeenCalledWith(failure, "update")
  })

  it("puts a deleted event back when the server rejects", async () => {
    const onError = vi.fn()
    const { result, removes } = await loaded({ onError })

    let deleting: Promise<boolean> | undefined
    act(() => {
      deleting = result.current.removeEvent("a")
    })
    expect(result.current.events).toEqual([])
    expect(result.current.pendingIds.has("a")).toBe(true)

    const failure = new Error("rejected")
    await act(async () => {
      nth(removes, 0).deferred.reject(failure)
      expect(await deleting).toBe(false)
    })
    expect(result.current.events.map((event) => event.id)).toEqual(["a"])
    expect(onError).toHaveBeenCalledWith(failure, "remove")
  })

  it("keeps a delete the server accepted", async () => {
    const { result, removes } = await loaded()

    let deleting: Promise<boolean> | undefined
    act(() => {
      deleting = result.current.removeEvent("a")
    })
    await act(async () => {
      nth(removes, 0).deferred.resolve(undefined)
      expect(await deleting).toBe(true)
    })

    expect(result.current.events).toEqual([])
    expect(result.current.pendingIds.size).toBe(0)
  })
})

describe("concurrent edits", () => {
  /** A calendar showing one loaded event, "a" — the thing each edit acts on. */
  async function loaded(options: Omit<Partial<UseCalendarOptions>, "source"> = {}) {
    const fake = fakeSource()
    const view = render({ ...options, source: fake.source })
    await act(async () => nth(fake.loads, 0).deferred.resolve([eventAt("a", "Breakfast", 15)]))
    return { ...fake, ...view }
  }

  it("does not resurrect an event when an in-flight update resolves after it was removed", async () => {
    const { result, updates, removes } = await loaded()

    let updating: Promise<CalendarEvent | null> | undefined
    act(() => {
      updating = result.current.updateEvent("a", { name: "Brunch" })
    })
    let removing: Promise<boolean> | undefined
    act(() => {
      removing = result.current.removeEvent("a")
    })
    expect(result.current.events).toEqual([])

    // The update's response lands after the remove already took effect: it
    // must not re-insert the event the user just deleted.
    await act(async () => {
      nth(updates, 0).deferred.resolve({ ...eventAt("a", "Brunch", 15), name: "Brunch (server)" })
      await updating
    })
    expect(result.current.events).toEqual([])

    await act(async () => {
      nth(removes, 0).deferred.resolve(undefined)
      await removing
    })
    expect(result.current.events).toEqual([])
    expect(result.current.pendingIds.size).toBe(0)
  })

  it("keeps the second of two overlapping updates and clears pendingIds only once both settle", async () => {
    const { result, updates } = await loaded()

    let first: Promise<CalendarEvent | null> | undefined
    act(() => {
      first = result.current.updateEvent("a", { name: "Brunch" })
    })
    let second: Promise<CalendarEvent | null> | undefined
    act(() => {
      second = result.current.updateEvent("a", { name: "Lunch" })
    })
    expect(updates).toHaveLength(2)

    // The second call's response lands first — the first is now the stale one.
    await act(async () => {
      nth(updates, 1).deferred.resolve({ ...eventAt("a", "Lunch", 15), name: "Lunch (server)" })
      await second
    })
    expect(result.current.events.map((event) => event.name)).toEqual(["Lunch (server)"])
    expect(result.current.pendingIds.has("a")).toBe(true)

    await act(async () => {
      nth(updates, 0).deferred.resolve({ ...eventAt("a", "Brunch", 15), name: "Brunch (server)" })
      await first
    })
    // The first update's late result must not overwrite the second's.
    expect(result.current.events.map((event) => event.name)).toEqual(["Lunch (server)"])
    expect(result.current.pendingIds.size).toBe(0)
  })

  it("does not roll back a newer update when an older overlapping one fails", async () => {
    const onError = vi.fn()
    const { result, updates } = await loaded({ onError })

    let first: Promise<CalendarEvent | null> | undefined
    act(() => {
      first = result.current.updateEvent("a", { name: "Brunch" })
    })
    let second: Promise<CalendarEvent | null> | undefined
    act(() => {
      second = result.current.updateEvent("a", { name: "Lunch" })
    })

    const failure = new Error("rejected")
    await act(async () => {
      nth(updates, 0).deferred.reject(failure)
      expect(await first).toBeNull()
    })
    // The failed, now-stale update's rollback must not erase the still-pending
    // second update's optimistic patch.
    expect(result.current.events.map((event) => event.name)).toEqual(["Lunch"])
    expect(onError).toHaveBeenCalledWith(failure, "update")
    expect(result.current.pendingIds.has("a")).toBe(true)

    await act(async () => {
      nth(updates, 1).deferred.resolve({ ...eventAt("a", "Lunch", 15), name: "Lunch (server)" })
      await second
    })
    expect(result.current.events.map((event) => event.name)).toEqual(["Lunch (server)"])
    expect(result.current.pendingIds.size).toBe(0)
  })

  it("keeps an optimistic update when a stale load response for the same event lands after it", async () => {
    const { result, loads, updates } = await loaded()

    let updating: Promise<CalendarEvent | null> | undefined
    act(() => {
      updating = result.current.updateEvent("a", { name: "Patched" })
    })
    expect(result.current.pendingIds.has("a")).toBe(true)

    // Switching to month view asks for a wider, not-yet-covered window that
    // still contains "a" — a second load racing the update still in flight.
    act(() => result.current.setView("month"))
    expect(loads).toHaveLength(2)

    await act(async () => nth(loads, 1).deferred.resolve([eventAt("a", "Breakfast", 15)]))
    // The load's answer predates the edit; it must not revert the patch.
    expect(result.current.events.map((event) => event.name)).toEqual(["Patched"])

    await act(async () => {
      nth(updates, 0).deferred.resolve({ ...eventAt("a", "Patched", 15), name: "Patched (server)" })
      await updating
    })
    expect(result.current.events.map((event) => event.name)).toEqual(["Patched (server)"])
    expect(result.current.pendingIds.size).toBe(0)
  })
})

describe("filters", () => {
  const resources = [
    { id: "r1", name: "Anna", color: "#f00" },
    { id: "r2", name: "Bo", color: "#00f" },
  ]

  async function withTwoResources() {
    const { source, loads } = fakeSource()
    const view = render({ source, resources })
    await act(async () =>
      nth(loads, 0).deferred.resolve([eventAt("a", "Breakfast", 15, "r1"), eventAt("b", "Lunch", 16, "r2")]),
    )
    return view
  }

  it("drops events of a hidden resource", async () => {
    const { result } = await withTwoResources()

    act(() => result.current.setResourceHidden("r2", true))

    expect(result.current.events.map((event) => event.id)).toEqual(["a"])
    expect(result.current.hiddenResourceIds).toEqual(["r2"])
  })

  it("matches the name filter case-insensitively and ignores surrounding space", async () => {
    const { result } = await withTwoResources()

    act(() => result.current.setFilterText("  brEAK "))

    expect(result.current.events.map((event) => event.id)).toEqual(["a"])
  })

  it("takes an event's colour from its resource, then falls back to the accent", async () => {
    const { result } = await withTwoResources()

    expect(result.current.colorOf(eventAt("a", "Breakfast", 15, "r1"))).toBe("#f00")
    expect(result.current.resourceOf(eventAt("a", "Breakfast", 15, "r1"))?.name).toBe("Anna")
    expect(result.current.colorOf(eventAt("c", "Alone", 15))).toBe("var(--cal-accent)")
  })
})

describe("flags", () => {
  it("turns off what the source cannot do", () => {
    const { source } = fakeSource({ create: false, update: false, remove: false })

    const { result } = render({ source })

    expect(result.current.flags).toEqual({ create: false, move: false, resize: false, edit: false, remove: false })
  })

  it("keeps what the source can do, unless the host turned it off", () => {
    const { source } = fakeSource()

    const { result } = render({ source, features: { remove: false } })

    expect(result.current.flags).toEqual({ create: true, move: true, resize: true, edit: true, remove: false })
  })
})

describe("preferences", () => {
  function fakeStorage(stored: Partial<CalendarPreferences> | null = null) {
    const saves: CalendarPreferences[] = []
    const clears: string[] = []
    const storage: PreferenceStorage = {
      load: () => stored,
      save: (_id, preferences) => void saves.push(preferences),
      clear: (id) => void clears.push(id),
    }
    return { storage, saves, clears }
  }

  it("writes a changed view to storage once the debounce elapses", () => {
    vi.useFakeTimers()
    const { source } = fakeSource()
    const { storage, saves } = fakeStorage()
    const { result } = render({ source, storage })
    expect(result.current.isCustomised).toBe(false)

    act(() => result.current.setView("month"))
    expect(result.current.isCustomised).toBe(true)
    expect(saves).toHaveLength(0)

    act(() => vi.advanceTimersByTime(400))
    expect(saves).toEqual([{ view: "month", showWeekends: true, hiddenResourceIds: [] }])
  })

  it("prefers stored preferences over the initial view and counts as customised", () => {
    const { source } = fakeSource()
    const { storage } = fakeStorage({ view: "agenda", showWeekends: false, hiddenResourceIds: ["gone"] })

    const { result } = render({ source, storage, initialView: "week" })

    expect(result.current.view).toBe("agenda")
    expect(result.current.showWeekends).toBe(false)
    // "gone" is not a known resource any more, so it is pruned rather than trusted.
    expect(result.current.hiddenResourceIds).toEqual([])
    expect(result.current.isCustomised).toBe(true)
  })

  it("clears storage and restores the declared preferences on reset", () => {
    const { source } = fakeSource()
    const { storage, clears } = fakeStorage()
    const { result } = render({ source, storage, initialView: "day" })

    act(() => result.current.setView("month"))
    act(() => result.current.resetPreferences())

    expect(result.current.view).toBe("day")
    expect(result.current.isCustomised).toBe(false)
    expect(clears).toEqual(["test"])
  })
})

describe("settings", () => {
  it("fills in the documented defaults", () => {
    const { source } = fakeSource()

    const { result } = render({ source })

    expect(result.current.settings).toEqual({
      weekStartsOn: 1,
      locale: navigator.language,
      dayStartHour: 0,
      dayEndHour: 24,
      snapMinutes: 15,
      defaultEventMinutes: 60,
    })
  })
})
