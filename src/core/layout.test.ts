import { describe, expect, it } from "vitest"
import type { CalendarEvent } from "../types"
import { layoutDay, limitColumns } from "./layout"

let nextId = 0

/** Builds a minimal timed event for packing tests; `id`/`name` default to something traceable. */
function makeEvent(start: Date, end: Date, overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  nextId += 1
  return { id: `evt-${nextId}`, name: `Event ${nextId}`, start, end, ...overrides }
}

const day = new Date(2022, 2, 15)

describe("layoutDay", () => {
  it("gives every event column 0 of 1 when nothing overlaps", () => {
    const a = makeEvent(new Date(2022, 2, 15, 9), new Date(2022, 2, 15, 10))
    const b = makeEvent(new Date(2022, 2, 15, 11), new Date(2022, 2, 15, 12))

    const blocks = layoutDay([a, b], day)

    expect(blocks).toHaveLength(2)
    expect(blocks.every((block) => block.column === 0 && block.columns === 1)).toBe(true)
  })

  it("splits two overlapping events into 2 columns", () => {
    const a = makeEvent(new Date(2022, 2, 15, 9), new Date(2022, 2, 15, 10, 30))
    const b = makeEvent(new Date(2022, 2, 15, 10), new Date(2022, 2, 15, 11))

    const blocks = layoutDay([a, b], day)

    expect(blocks.map((block) => block.columns)).toEqual([2, 2])
    expect(new Set(blocks.map((block) => block.column))).toEqual(new Set([0, 1]))
  })

  it("packs a transitive chain A(9-11) B(10-12) C(11-13) with A and C sharing column 0", () => {
    const a = makeEvent(new Date(2022, 2, 15, 9), new Date(2022, 2, 15, 11), { name: "A" })
    const b = makeEvent(new Date(2022, 2, 15, 10), new Date(2022, 2, 15, 12), { name: "B" })
    const c = makeEvent(new Date(2022, 2, 15, 11), new Date(2022, 2, 15, 13), { name: "C" })

    const blocks = layoutDay([a, b, c], day)
    const byName = new Map(blocks.map((block) => [block.event.name, block]))

    expect(byName.get("A")).toMatchObject({ column: 0, columns: 2 })
    expect(byName.get("B")).toMatchObject({ column: 1, columns: 2 })
    expect(byName.get("C")).toMatchObject({ column: 0, columns: 2 })
  })

  it("clips an event crossing midnight on both sides to the day's 0..1440 range", () => {
    const event = makeEvent(new Date(2022, 2, 14, 22), new Date(2022, 2, 16, 2))

    const [block] = layoutDay([event], day)

    expect(block).toMatchObject({ startMinutes: 0, endMinutes: 1440 })
  })

  it("drops an event that does not overlap the day", () => {
    const event = makeEvent(new Date(2022, 2, 16, 9), new Date(2022, 2, 16, 10))

    const blocks = layoutDay([event], day)

    expect(blocks).toHaveLength(0)
  })

  it("clips a multi-day event ending exactly at next midnight to endMinutes 1440", () => {
    const event = makeEvent(new Date(2022, 2, 15, 22), new Date(2022, 2, 16, 0))

    const [block] = layoutDay([event], day)

    expect(block).toMatchObject({ startMinutes: 1320, endMinutes: 1440 })
  })

  it("gives a zero-length event a 1-minute span for packing while keeping startMinutes truthful", () => {
    const event = makeEvent(new Date(2022, 2, 15, 9), new Date(2022, 2, 15, 9))

    const [block] = layoutDay([event], day)

    expect(block).toMatchObject({ startMinutes: 540, endMinutes: 541 })
  })
})

describe("limitColumns", () => {
  const at = (hour: number, minute = 0) => new Date(2022, 2, 15, hour, minute)

  it("keeps a cluster that fits as it is", () => {
    const blocks = layoutDay([makeEvent(at(9), at(10)), makeEvent(at(9, 30), at(10, 30))], day)
    const { visible, overflow } = limitColumns(blocks, 3)
    expect(visible).toEqual(blocks)
    expect(overflow).toEqual([])
  })

  it("draws the first columns of a crowded cluster and gathers the rest into one «+N» slot", () => {
    const six = Array.from({ length: 6 }, () => makeEvent(at(14), at(15)))
    const { visible, overflow } = limitColumns(layoutDay(six, day), 3)
    expect(visible).toHaveLength(2)
    expect(visible.every((block) => block.columns === 3 && block.column < 2)).toBe(true)
    expect(overflow).toEqual([{ column: 2, columns: 3, startMinutes: 14 * 60, endMinutes: 15 * 60, count: 4, events: expect.any(Array) }])
  })

  it("limits each crowded cluster on its own and leaves the others alone", () => {
    const morning = Array.from({ length: 4 }, () => makeEvent(at(9), at(10)))
    const lunch = [makeEvent(at(12), at(13))]
    const { visible, overflow } = limitColumns(layoutDay([...morning, ...lunch], day), 3)
    expect(overflow).toHaveLength(1)
    expect(overflow[0]?.count).toBe(2)
    expect(visible.find((block) => block.startMinutes === 12 * 60)).toMatchObject({ column: 0, columns: 1 })
  })

  it("spans the slot from the first hidden start to the last hidden end", () => {
    const events = [makeEvent(at(10), at(12)), makeEvent(at(10), at(11)), makeEvent(at(10, 30), at(11, 30)), makeEvent(at(11), at(13))]
    const { overflow } = limitColumns(layoutDay(events, day), 2)
    expect(overflow[0]).toMatchObject({ column: 1, columns: 2, startMinutes: 10 * 60 })
    expect(overflow[0]?.endMinutes).toBe(13 * 60)
  })
})
