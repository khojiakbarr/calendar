import { useCallback, useRef, useState } from "react"
import type { CalendarPreferences, CalendarView, PreferenceStorage } from "../types"
import { noPreferenceStorage, prunePreferences } from "./persistence"
import { useDebouncedSave } from "./useDebouncedSave"

/** What a calendar looks like before anyone has touched it. */
const DEFAULT_PREFERENCES: CalendarPreferences = {
  view: "week",
  showWeekends: true,
  hiddenResourceIds: [],
}

/**
 * One shared do-nothing adapter.
 *
 * It holds no state, so every calendar without storage can share it — and a
 * stable identity keeps the reset action from being rebuilt every render.
 */
const NO_STORAGE = noPreferenceStorage()

/** Options for {@link usePreferences}. */
export interface UsePreferencesOptions {
  /** The calendar's id: the key preferences are stored under. */
  id: string
  storage?: PreferenceStorage | undefined
  /** Applied over the defaults, and overridden by anything stored. */
  initialPreferences?: Partial<CalendarPreferences> | undefined
  /** Convenience for `initialPreferences.view`; likewise loses to stored preferences. */
  initialView?: CalendarView | undefined
  /** Resource ids that exist now; stored ids outside this list are dropped. */
  resourceIds: readonly string[]
}

/** The preferences plus the ways the shell changes them. */
export interface PreferencesController {
  preferences: CalendarPreferences
  /** True once preferences were loaded from storage or changed since mount. */
  isCustomised: boolean
  setView(view: CalendarView): void
  setShowWeekends(show: boolean): void
  setResourceHidden(resourceId: string, hidden: boolean): void
  setResourcesHidden(resourceIds: readonly string[], hidden: boolean): void
  resetPreferences(): void
}

/** Preferences, plus whether they are worth writing back. */
interface PreferencesState {
  preferences: CalendarPreferences
  isCustomised: boolean
  /**
   * Changed by the user since mount. Distinct from `isCustomised`: preferences
   * read from storage are customised but have nothing new to save, and
   * re-saving them on mount is a pointless write — or a request, for a
   * server-backed adapter.
   */
  hasUnsavedChanges: boolean
}

/**
 * Remember how the user set this calendar up, and write it back as they change it.
 *
 * Storage is read exactly once, when the hook mounts. Re-reading on every
 * render would fight the user: a change is saved, then immediately re-applied
 * from disk. The adapter itself is kept in a ref because the documented usage
 * is `storage: localStoragePreferences()` inline — a fresh object per render of
 * the host, which would make every action unstable if it were a dependency.
 *
 * @param options - See {@link UsePreferencesOptions}.
 * @returns The current preferences and stable setters for them.
 */
export function usePreferences({
  id,
  storage,
  initialPreferences,
  initialView,
  resourceIds,
}: UsePreferencesOptions): PreferencesController {
  const storageRef = useRef<PreferenceStorage>(storage ?? NO_STORAGE)
  storageRef.current = storage ?? NO_STORAGE

  /** The declared starting point, captured once: what a reset goes back to. */
  const declaredRef = useRef<CalendarPreferences>({
    ...DEFAULT_PREFERENCES,
    ...(initialView ? { view: initialView } : {}),
    ...initialPreferences,
  })

  const [state, setState] = useState<PreferencesState>(() => {
    const stored = storageRef.current.load(id)
    return {
      preferences: { ...declaredRef.current, ...prunePreferences(stored ?? {}, resourceIds) },
      isCustomised: stored !== null,
      hasUnsavedChanges: false,
    }
  })

  useDebouncedSave(storageRef.current, id, state.preferences, state.hasUnsavedChanges)

  /** Record a change, unless it leaves the preferences exactly as they were. */
  const change = useCallback((next: (previous: CalendarPreferences) => CalendarPreferences | null) => {
    setState((previous) => {
      const preferences = next(previous.preferences)
      if (!preferences) return previous
      return { preferences, isCustomised: true, hasUnsavedChanges: true }
    })
  }, [])

  const setView = useCallback(
    (view: CalendarView) => change((previous) => (previous.view === view ? null : { ...previous, view })),
    [change],
  )

  const setShowWeekends = useCallback(
    (showWeekends: boolean) =>
      change((previous) => (previous.showWeekends === showWeekends ? null : { ...previous, showWeekends })),
    [change],
  )

  const setResourceHidden = useCallback(
    (resourceId: string, hidden: boolean) =>
      change((previous) => {
        const isHidden = previous.hiddenResourceIds.includes(resourceId)
        if (isHidden === hidden) return null
        const hiddenResourceIds = hidden
          ? [...previous.hiddenResourceIds, resourceId]
          : previous.hiddenResourceIds.filter((entry) => entry !== resourceId)
        return { ...previous, hiddenResourceIds }
      }),
    [change],
  )

  const setResourcesHidden = useCallback(
    (resourceIds: readonly string[], hidden: boolean) =>
      change((previous) => {
        const before = new Set(previous.hiddenResourceIds)
        const after = new Set(before)
        for (const resourceId of resourceIds) {
          if (hidden) after.add(resourceId)
          else after.delete(resourceId)
        }
        if (after.size === before.size && [...after].every((resourceId) => before.has(resourceId))) return null
        return { ...previous, hiddenResourceIds: [...after] }
      }),
    [change],
  )

  const resetPreferences = useCallback(() => {
    storageRef.current.clear(id)
    // hasUnsavedChanges stays false so the debounced save does not write the
    // defaults straight back over the entry that was just cleared.
    setState({ preferences: declaredRef.current, isCustomised: false, hasUnsavedChanges: false })
  }, [id])

  return {
    preferences: state.preferences,
    isCustomised: state.isCustomised,
    setView,
    setShowWeekends,
    setResourceHidden,
    setResourcesHidden,
    resetPreferences,
  }
}
