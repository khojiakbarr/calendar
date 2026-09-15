import type { CalendarPreferences, PreferenceStorage } from "../types"

/**
 * Persisting a calendar's preferences.
 *
 * Every entry is keyed by the calendar's `id`. That is the whole reason `id`
 * is a required option: two calendars rendered on one page have independent
 * preferences, and a shared storage key would let one silently overwrite the
 * other's view or filter.
 */

const KEY_PREFIX = "calendar:prefs:"

/** Preferences written by an older version of the library are discarded, not guessed at. */
const FORMAT_VERSION = 1

interface StoredPreferences {
  v: number
  preferences: Partial<CalendarPreferences>
}

/**
 * Keep preferences in `localStorage`, scoped to the browser.
 *
 * Every access is guarded: private windows, disabled site data and full quotas
 * all throw, and a calendar that cannot remember its preferences should still render.
 *
 * @param prefix - Key prefix, useful when several apps share an origin.
 * @returns A storage adapter for {@link useCalendar}.
 *
 * @example
 * useCalendar({ id: "work", storage: localStoragePreferences(), ... })
 */
export function localStoragePreferences(prefix = KEY_PREFIX): PreferenceStorage {
  return {
    load(id) {
      try {
        const raw = localStorage.getItem(prefix + id)
        if (!raw) return null
        const parsed = JSON.parse(raw) as StoredPreferences
        if (parsed.v !== FORMAT_VERSION) return null
        return parsed.preferences
      } catch {
        return null
      }
    },
    save(id, preferences) {
      try {
        const payload: StoredPreferences = { v: FORMAT_VERSION, preferences }
        localStorage.setItem(prefix + id, JSON.stringify(payload))
      } catch {
        // Quota or a blocked store. The preferences still apply for this session.
      }
    },
    clear(id) {
      try {
        localStorage.removeItem(prefix + id)
      } catch {
        // Nothing to do — the entry is unreachable either way.
      }
    },
  }
}

/**
 * Discard preferences when the calendar unmounts.
 *
 * The default, because silently remembering state a developer did not ask for
 * is surprising — and because a server-backed adapter is usually what a
 * multi-user application actually wants.
 *
 * @returns A storage adapter that stores nothing.
 */
export function noPreferenceStorage(): PreferenceStorage {
  return {
    load: () => null,
    save: () => undefined,
    clear: () => undefined,
  }
}

/**
 * Validate and clean stored preferences.
 *
 * Drops resources that are no longer defined, invalid views, and non-boolean
 * showWeekends. This prevents stale data from persisting when the calendar
 * configuration changes.
 *
 * @param stored - Preferences as they came out of storage.
 * @param knownResourceIds - Resource IDs the calendar currently defines.
 * @returns The preferences with invalid entries removed.
 */
export function prunePreferences(
  stored: Partial<CalendarPreferences>,
  knownResourceIds: readonly string[],
): Partial<CalendarPreferences> {
  const pruned: Partial<CalendarPreferences> = {}

  const validViews = new Set(["day", "week", "month", "year", "agenda"])
  if (stored.view && validViews.has(stored.view)) {
    pruned.view = stored.view
  }

  if (typeof stored.showWeekends === "boolean") {
    pruned.showWeekends = stored.showWeekends
  }

  if (stored.hiddenResourceIds) {
    const knownSet = new Set(knownResourceIds)
    pruned.hiddenResourceIds = stored.hiddenResourceIds.filter((id) => knownSet.has(id))
  }

  return pruned
}
