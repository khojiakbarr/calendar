import type { CalendarEvent } from "../types"
import { clampRange, minutesOfDay, startOfDay } from "./date"

/**
 * A timed event clipped to one day's time grid, with its packing position.
 *
 * `startMinutes`/`endMinutes` are truthful clock minutes within the day
 * (0..1440) except when the event is zero-length: packing still needs a
 * non-zero span to detect overlap, so `endMinutes` is nudged to
 * `startMinutes + 1` in that case only.
 */
export interface TimedBlock<T> {
  event: CalendarEvent<T>
  startMinutes: number
  endMinutes: number
  /** 0-based column within its overlap cluster. */
  column: number
  /** Number of columns the cluster needs — every block in the cluster shares this width. */
  columns: number
}

/**
 * Clips `events` to `day`'s 0..1440 minute range and orders them the way the
 * packer expects: start time ascending, and among equal starts the longer
 * event first so it claims column 0 and shorter ones stack beside it.
 */
function clipToDay<T>(events: CalendarEvent<T>[], day: Date): TimedBlock<T>[] {
  const dayStart = startOfDay(day)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const blocks: TimedBlock<T>[] = []
  for (const event of events) {
    // clampRange treats a zero-length event as a non-overlapping point (its own
    // start/end are equal, so nothing is strictly between them) and drops it, but
    // the spec wants a visible 1-minute block for it — handle that case directly
    // instead of asking clampRange to detect an "overlap" that isn't one.
    if (event.start.getTime() === event.end.getTime()) {
      if (event.start.getTime() < dayStart.getTime() || event.start.getTime() >= dayEnd.getTime()) continue
      const startMinutes = minutesOfDay(event.start)
      blocks.push({ event, startMinutes, endMinutes: startMinutes + 1, column: 0, columns: 1 })
      continue
    }

    const clamped = clampRange({ start: event.start, end: event.end }, { start: dayStart, end: dayEnd })
    if (!clamped) continue
    const startMinutes = minutesOfDay(clamped.start)
    // clampRange gives a half-open end; an end exactly at next midnight reads as 0 via
    // minutesOfDay, so treat that boundary as 1440 rather than losing the day's last minute.
    const endMinutes = clamped.end.getTime() === dayEnd.getTime() ? 1440 : minutesOfDay(clamped.end)
    blocks.push({ event, startMinutes, endMinutes, column: 0, columns: 1 })
  }

  return blocks.sort((a, b) => {
    const aDuration = a.endMinutes - a.startMinutes
    const bDuration = b.endMinutes - b.startMinutes
    return a.startMinutes - b.startMinutes || bDuration - aDuration
  })
}

/**
 * Splits a start-sorted list of blocks into clusters of transitively
 * overlapping events — the unit within which column packing happens.
 *
 * A cluster grows while its running "furthest end so far" stays ahead of the
 * next block's start; once a block starts at or after that point, nothing
 * later can transitively reach back into the cluster, so it closes.
 */
export function clusterEvents<T>(blocks: TimedBlock<T>[]): TimedBlock<T>[][] {
  const clusters: TimedBlock<T>[][] = []
  let current: TimedBlock<T>[] = []
  let clusterEnd = -Infinity

  for (const block of blocks) {
    if (current.length > 0 && block.startMinutes >= clusterEnd) {
      clusters.push(current)
      current = []
      clusterEnd = -Infinity
    }
    current.push(block)
    clusterEnd = Math.max(clusterEnd, block.endMinutes)
  }
  if (current.length > 0) clusters.push(current)

  return clusters
}

/**
 * Assigns each block in a cluster the first column whose last placed end is
 * at or before this start, then stamps every block with the cluster's total
 * column count. Returns new block objects rather than mutating the input.
 */
function packCluster<T>(cluster: readonly TimedBlock<T>[]): TimedBlock<T>[] {
  const columnEnds: number[] = [] // last endMinutes placed in each column so far
  const withColumn = cluster.map((block) => {
    const column = columnEnds.findIndex((end) => end <= block.startMinutes)
    if (column === -1) {
      columnEnds.push(block.endMinutes)
      return { ...block, column: columnEnds.length - 1 }
    }
    columnEnds[column] = block.endMinutes
    return { ...block, column }
  })
  return withColumn.map((block) => ({ ...block, columns: columnEnds.length }))
}

/**
 * Packs one day's timed events into side-by-side columns for the time grid.
 *
 * Events that do not touch `day` are dropped; events spanning into or past
 * it are clipped to its 0..1440 minute range. Overlapping events form a
 * cluster and share a column count so they render at equal width; events
 * that never overlap anything get `column: 0, columns: 1`.
 *
 * @example
 * const blocks = layoutDay(events, new Date(2022, 2, 15))
 */
export function layoutDay<T>(events: CalendarEvent<T>[], day: Date): TimedBlock<T>[] {
  const blocks = clipToDay(events, day)
  const clusters = clusterEvents(blocks)
  return clusters.flatMap((cluster) => packCluster(cluster))
}
