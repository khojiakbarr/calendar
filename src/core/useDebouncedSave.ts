import { useCallback, useEffect, useRef } from "react"
import type { PreferenceStorage, CalendarPreferences } from "../types"

/** How long to wait after the last change before writing. */
const SAVE_DELAY_MS = 350

/**
 * Persist preferences, but not on every frame.
 *
 * Changing the view or toggling an option can produce state updates per
 * interaction. Writing straight through means multiple `JSON.stringify`
 * calls and multiple synchronous `localStorage` writes, which can be
 * expensive for a storage adapter that talks to a server.
 *
 * Only the settled preferences are worth keeping, so the write waits for
 * interactions to stop. A pending write is flushed on unmount and when the
 * page is hidden, so preferences are never lost by navigating away mid-change.
 *
 * The adapter is read through a ref rather than listed as a dependency: the
 * documented usage is `storage: localStoragePreferences()` inline, a fresh
 * object on every render of the host. Keying the timer on that identity
 * restarted the wait on every unrelated re-render — a host re-rendering
 * faster than the delay never saved at all, one re-rendering slower
 * re-saved unchanged preferences each time.
 *
 * @param storage - Where to write.
 * @param id - The calendar's id.
 * @param preferences - The current preferences.
 * @param enabled - Whether `preferences` holds a change the user made since
 *   mount. While false nothing is queued, so mounting does not re-save what
 *   was just loaded and a reset is not undone by the flush.
 */
export function useDebouncedSave(
  storage: PreferenceStorage,
  id: string,
  preferences: CalendarPreferences,
  enabled: boolean,
): void {
  const pending = useRef<CalendarPreferences | null>(null)
  const latest = useRef({ storage, id })
  latest.current = { storage, id }

  const flush = useCallback(() => {
    if (!pending.current) return
    latest.current.storage.save(latest.current.id, pending.current)
    pending.current = null
  }, [])

  useEffect(() => {
    if (!enabled) {
      pending.current = null
      return
    }
    pending.current = preferences
    const timer = setTimeout(flush, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [id, preferences, enabled, flush])

  // A full navigation gives no unmount; `pagehide` is the last chance to write.
  useEffect(() => {
    window.addEventListener("pagehide", flush)
    return () => {
      window.removeEventListener("pagehide", flush)
      flush()
    }
  }, [flush])
}
