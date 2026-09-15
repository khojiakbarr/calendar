import type { CalendarView } from "../types"

/** What the demo lets a URL decide, so a state can be linked to or screenshotted. */
export interface DemoUrlOptions {
  view: CalendarView | undefined
  theme: "light" | "dark" | undefined
  /** Anchor date for both the calendar and the seeded data. */
  date: Date | undefined
  latencyMs: number | undefined
  /** Chrome-less mode: no demo bar, no log rail, no page padding. */
  embed: boolean
}

const VIEWS: readonly CalendarView[] = ["day", "week", "month", "year", "agenda"]

/**
 * Reads `?view=week&theme=light&date=2026-09-15&latency=0&embed=1`.
 *
 * Exists so the README screenshots are reproducible from a URL rather than
 * from a sequence of clicks, and so a bug report can link to the exact state.
 * Every value is validated; a bad one is simply ignored.
 *
 * @param search - `location.search`, or any query string.
 * @returns The recognised options; anything absent or invalid is `undefined`.
 */
export function readDemoUrlOptions(search: string): DemoUrlOptions {
  const params = new URLSearchParams(search)
  const view = params.get("view")
  const theme = params.get("theme")
  const date = params.get("date")
  const latency = Number(params.get("latency"))
  const parsedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00`) : undefined
  return {
    view: VIEWS.find((candidate) => candidate === view),
    theme: theme === "light" || theme === "dark" ? theme : undefined,
    date: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : undefined,
    latencyMs: params.has("latency") && Number.isFinite(latency) && latency >= 0 ? latency : undefined,
    embed: params.get("embed") === "1",
  }
}
