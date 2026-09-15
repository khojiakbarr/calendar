import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Calendar } from "../components/Calendar"
import { useMediaQuery } from "../components/useMediaQuery"
import { localStoragePreferences, noPreferenceStorage } from "../core/persistence"
import type { EventSourceAction } from "../types"
import { useCalendar } from "../useCalendar"
import { createMockServer, demoResources, type ServerLogEntry } from "./mockServer"
import { readDemoUrlOptions } from "./urlOptions"

/** Read once: the URL is the demo's only input that never changes while it runs. */
const urlOptions = readDemoUrlOptions(typeof location === "undefined" ? "" : location.search)

/** How many rows the "Server log" rail keeps — enough to see a pattern, not a scrollback. */
const MAX_LOG_ENTRIES = 30

/** Below this width the server log hides behind a toggle instead of sitting beside the calendar. */
const NARROW_QUERY = "(max-width: 900px)"

/** The three latencies the demo lets you compare a slow network against. */
const LATENCY_OPTIONS_MS = [0, 350, 1500] as const

/** What the theme `<select>` offers; "system" is `Calendar`'s own default (no `theme` prop). */
type ThemeChoice = "system" | "light" | "dark"

/** `HH:MM:SS`, 24-hour — matches the log's own timestamps regardless of the visitor's locale. */
function formatClock(date: Date): string {
  return date.toLocaleTimeString("en-GB", { hour12: false })
}

/**
 * Development playground and manual test bed.
 *
 * Everything here proves the server-driven contract end to end: a slow or
 * failing `EventSource` still leaves the calendar consistent, because every
 * request and its outcome is visible in the log rail rather than only in
 * the network tab.
 */
export function Demo() {
  const isNarrow = useMediaQuery(NARROW_QUERY)
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>(urlOptions.theme ?? "system")
  const [latencyMs, setLatencyMs] = useState(urlOptions.latencyMs ?? 350)
  const [failNextChecked, setFailNextChecked] = useState(false)
  const [log, setLog] = useState<ServerLogEntry[]>([])
  const [lastError, setLastError] = useState<string | null>(null)
  const [logOpen, setLogOpen] = useState(true)

  // Below 900px the log rail would otherwise eat most of the viewport on
  // first paint; close it the first time the layout goes narrow and leave
  // every later toggle to the visitor.
  const closedForNarrowRef = useRef(false)
  useEffect(() => {
    if (!isNarrow || closedForNarrowRef.current) return
    closedForNarrowRef.current = true
    setLogOpen(false)
  }, [isNarrow])

  // A ref because `createMockServer` reads it synchronously, once per call,
  // and must see the toggle's *current* value without the server itself
  // being recreated on every click (only `latencyMs` should do that).
  const failNextRef = useRef(false)

  const handleFailNextToggle = (checked: boolean) => {
    failNextRef.current = checked
    setFailNextChecked(checked)
  }

  // One-shot: fails exactly the next request, then resets itself — both the
  // ref the server reads and the checkbox the visitor sees.
  const failNext = useCallback(() => {
    if (!failNextRef.current) return false
    failNextRef.current = false
    setFailNextChecked(false)
    return true
  }, [])

  const handleLog = useCallback((entry: ServerLogEntry) => {
    setLog((entries) => [...entries, entry].slice(-MAX_LOG_ENTRIES))
  }, [])

  const server = useMemo(
    () => createMockServer({ latencyMs, failNext, onLog: handleLog, ...(urlOptions.date ? { seed: urlOptions.date } : {}) }),
    // `failNext` and `handleLog` are stable callbacks that always read the
    // latest ref/state — only a latency change should spin up a fresh server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [latencyMs],
  )

  const handleError = useCallback((error: unknown, action: EventSourceAction) => {
    setLastError(`${action}: ${error instanceof Error ? error.message : String(error)}`)
  }, [])

  const instance = useCalendar({
    id: "demo",
    source: server,
    resources: demoResources,
    // A linked state must not be overridden by whatever this browser stored last.
    storage: urlOptions.embed ? noPreferenceStorage() : localStoragePreferences(),
    initialView: urlOptions.view ?? "week",
    ...(urlOptions.date ? { initialDate: urlOptions.date } : {}),
    onError: handleError,
  })

  if (urlOptions.embed) {
    return (
      <div className="cal-demo cal-demo-embed">
        <Calendar instance={instance} height="100%" {...(themeChoice === "system" ? {} : { theme: themeChoice })} />
      </div>
    )
  }

  return (
    <div className="cal-demo">
      <header className="cal-demo-bar">
        <strong className="cal-demo-title">@khojiakbarr/calendar</strong>
        <div className="cal-demo-controls">
          <label className="cal-demo-field">
            Theme
            <select value={themeChoice} onChange={(event) => setThemeChoice(event.target.value as ThemeChoice)}>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label className="cal-demo-field cal-demo-checkbox">
            <input
              type="checkbox"
              checked={failNextChecked}
              onChange={(event) => handleFailNextToggle(event.target.checked)}
            />
            Fail next request
          </label>
          <label className="cal-demo-field">
            Latency
            <select value={latencyMs} onChange={(event) => setLatencyMs(Number(event.target.value))}>
              {LATENCY_OPTIONS_MS.map((ms) => (
                <option key={ms} value={ms}>
                  {ms} ms
                </option>
              ))}
            </select>
          </label>
          {isNarrow ? (
            <button type="button" className="cal-demo-log-toggle" aria-pressed={logOpen} onClick={() => setLogOpen((open) => !open)}>
              Log
            </button>
          ) : (
            !logOpen && (
              <button type="button" className="cal-demo-reopen-log" onClick={() => setLogOpen(true)}>
                Server log
              </button>
            )
          )}
        </div>
      </header>

      <div className="cal-demo-main">
        <div className="cal-demo-calendar">
          <Calendar instance={instance} height="100%" {...(themeChoice === "system" ? {} : { theme: themeChoice })} />
        </div>
        {logOpen && <ServerLog log={log} lastError={lastError} onClose={() => setLogOpen(false)} />}
      </div>
    </div>
  )
}

interface ServerLogProps {
  log: ServerLogEntry[]
  lastError: string | null
  onClose: () => void
}

/**
 * The demo's proof of the server round trip: a live feed of what the mock
 * backend did, newest first, plus the last rejection `onError` reported.
 */
function ServerLog({ log, lastError, onClose }: ServerLogProps) {
  return (
    <aside className="cal-demo-log">
      <div className="cal-demo-log-header">
        <h2>Server log</h2>
        <button type="button" aria-label="Close server log" onClick={onClose}>
          ×
        </button>
      </div>
      {lastError && <p className="cal-demo-log-error">{lastError}</p>}
      <ul className="cal-demo-log-list">
        {log.length === 0 && <li className="cal-demo-log-empty">Waiting for the first request…</li>}
        {[...log].reverse().map((entry) => (
          <li key={`${entry.method}-${entry.at.getTime()}-${entry.detail}`}>
            <span className="cal-demo-log-time">{formatClock(entry.at)}</span>
            <span className="cal-demo-log-method">{entry.method}</span>
            <span className="cal-demo-log-detail">{entry.detail}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
