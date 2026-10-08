import { useCallback, useMemo, useRef, useState } from "react"
import { TONE_COLOR, toneOf } from "./core/looks"
import { emptyStore, eventsInRange, type EventStoreState } from "./core/eventStore"
import { useCalendarView } from "./core/useCalendarView"
import { useEventLoading } from "./core/useEventLoading"
import { useEventMutations } from "./core/useEventMutations"
import { usePreferences } from "./core/usePreferences"
import type { CalendarInstance, CalendarSettings } from "./instance"
import type {
  CalendarEvent,
  CalendarFeatureFlags,
  CalendarPreferences,
  CalendarResource,
  CalendarView,
  EventSource,
  EventSourceAction,
  PreferenceStorage,
  WeekDay,
} from "./types"

/** Shared empty list, so an omitted `resources` option keeps a stable identity. */
const NO_RESOURCES: CalendarResource[] = []

/** Used when the environment has no `navigator` (SSR, or a test runner without one). */
const FALLBACK_LOCALE = "en-US"

/** Colour of an event that neither it nor its resource gives one. */
const DEFAULT_EVENT_COLOR = "var(--cal-accent)"

/** The browser's clock, the default `now`; module-level so its identity never changes. */
const systemNow = (): Date => new Date()

/** Everything {@link useCalendar} accepts. Only `id` and `source` are required. */
export interface UseCalendarOptions<TData = unknown> {
  /**
   * Stable identity for this calendar, unique within the application: it is the
   * key preferences are stored under. Two calendars sharing an id overwrite
   * each other's view and filters.
   */
  id: string
  /** Where events are fetched from and edits are sent. */
  source: EventSource<TData>
  /** The calendars events belong to; they supply colours and the sidebar filter. */
  resources?: CalendarResource[]
  /** The day first shown. Defaults to today. */
  initialDate?: Date
  /** The view first shown, unless the user already stored one. */
  initialView?: CalendarView
  /** Where preferences live between visits. Defaults to not persisting. */
  storage?: PreferenceStorage
  /** Preferences applied the first time a user opens this calendar. */
  initialPreferences?: Partial<CalendarPreferences>
  /** Turn gestures off. Each defaults to on, and needs its source method too. */
  features?: CalendarFeatureFlags
  /** First day of the week, `Date.getDay()` numbering. Default 1 (Monday). */
  weekStartsOn?: WeekDay
  /** BCP 47 tag for `Intl`. Defaults to the browser's language. */
  locale?: string
  /** First hour drawn on the time grid. Default 0. */
  dayStartHour?: number
  /** Hour boundary the time grid ends at. Default 24. */
  dayEndHour?: number
  /** Drag gestures round to this many minutes. Default 15. */
  snapMinutes?: number
  /** Length of an event created with a click. Default 60. */
  defaultEventMinutes?: number
  /** What "now" is. Default the browser's clock. See {@link CalendarSettings.now}. */
  now?: () => Date
  /** Told about every rejection, with the action that caused it. */
  onError?: (error: unknown, action: EventSourceAction) => void
}

/** The browser's language, where there is a browser. */
function defaultLocale(): string {
  if (typeof navigator === "undefined") return FALLBACK_LOCALE
  return navigator.language || FALLBACK_LOCALE
}

/**
 * Drive a calendar: what is shown, what has been loaded, and every edit.
 *
 * The hook owns all the state and hands back one object; the built-in shell and
 * a hand-written one see exactly the same surface. Events are fetched per
 * visible window rather than all at once, cached by range so navigating back
 * costs nothing, and every edit is applied optimistically with rollback.
 *
 * @param options - See {@link UseCalendarOptions}.
 * @returns The instance a `<Calendar>` (or your own shell) renders.
 *
 * @example
 * const calendar = useCalendar({ id: "clinic", source, resources })
 * return <Calendar instance={calendar} />
 */
export function useCalendar<TData = unknown>({
  id,
  source,
  resources = NO_RESOURCES,
  initialDate,
  initialView,
  storage,
  initialPreferences,
  features,
  weekStartsOn = 1,
  locale,
  dayStartHour = 0,
  dayEndHour = 24,
  snapMinutes = 15,
  defaultEventMinutes = 60,
  now = systemNow,
  onError,
}: UseCalendarOptions<TData>): CalendarInstance<TData> {
  const settings: CalendarSettings = useMemo(
    () => ({
      weekStartsOn,
      locale: locale ?? defaultLocale(),
      dayStartHour,
      dayEndHour,
      snapMinutes,
      defaultEventMinutes,
      now,
    }),
    [weekStartsOn, locale, dayStartHour, dayEndHour, snapMinutes, defaultEventMinutes, now],
  )

  const resourceIds = useMemo(() => resources.map((resource) => resource.id), [resources])
  const { preferences, isCustomised, setView, setShowWeekends, setResourceHidden, setResourcesHidden, resetPreferences } =
    usePreferences({ id, storage, initialPreferences, initialView, resourceIds })
  const { view, showWeekends, hiddenResourceIds } = preferences

  const { date, range, days, window, setDate, goToday, goNext, goPrevious } = useCalendarView({
    view,
    weekStartsOn,
    showWeekends,
    initialDate,
    now,
  })

  const [filterText, setFilterTextState] = useState("")
  const [store, setStore] = useState<EventStoreState<TData>>(emptyStore)
  const [reloadToken, setReloadToken] = useState(0)

  // Mutations run first so `pendingIds` exists before `useEventLoading` reads
  // it: a load response must protect whichever ids are pending *when it lands*,
  // not whichever were pending when the request started (see mergeLoaded).
  const { pendingIds, createEvent, updateEvent, removeEvent } = useEventMutations({
    source,
    store,
    setStore,
    onError,
  })
  const { status, error } = useEventLoading({
    source,
    window,
    store,
    setStore,
    onError,
    reloadToken,
    protectedIds: pendingIds,
  })

  const events = useMemo(() => {
    const hidden = new Set(hiddenResourceIds)
    const needle = filterText.trim().toLowerCase()
    return eventsInRange(store, range).filter((event) => {
      if (event.resourceId !== undefined && hidden.has(event.resourceId)) return false
      return needle === "" || event.name.toLowerCase().includes(needle)
    })
  }, [store, range, hiddenResourceIds, filterText])

  // Capabilities as primitives: the source itself is usually an inline object,
  // and depending on its identity would rebuild the flags on every host render.
  const canCreate = typeof source.create === "function"
  const canUpdate = typeof source.update === "function"
  const canRemove = typeof source.remove === "function"
  const flags: Required<CalendarFeatureFlags> = useMemo(
    () => ({
      create: (features?.create ?? true) && canCreate,
      move: (features?.move ?? true) && canUpdate,
      resize: (features?.resize ?? true) && canUpdate,
      edit: (features?.edit ?? true) && canUpdate,
      remove: (features?.remove ?? true) && canRemove,
    }),
    [features?.create, features?.move, features?.resize, features?.edit, features?.remove, canCreate, canUpdate, canRemove],
  )

  const setFilterText = useCallback((text: string) => setFilterTextState(text), [])

  const reload = useCallback(() => {
    // Emptying the store is what makes this a refetch rather than a no-op: the
    // window is covered, and a covered window is never requested again.
    setStore(emptyStore<TData>())
    setReloadToken((token) => token + 1)
  }, [])

  const resourceById = useMemo(
    () => new Map(resources.map((resource) => [resource.id, resource])),
    [resources],
  )
  const resourcesRef = useRef(resourceById)
  resourcesRef.current = resourceById

  const resourceOf = useCallback((event: CalendarEvent<TData>): CalendarResource | undefined => {
    if (event.resourceId === undefined) return undefined
    return resourcesRef.current.get(event.resourceId)
  }, [])

  const colorOf = useCallback(
    (event: CalendarEvent<TData>): string => {
      const tone = toneOf(event)
      return event.color ?? (tone === undefined ? undefined : TONE_COLOR[tone]) ?? resourceOf(event)?.color ?? DEFAULT_EVENT_COLOR
    },
    [resourceOf],
  )

  // One object, memoised: the shell passes `instance` down to every view, and a
  // fresh object each render would defeat every `memo()` below it.
  return useMemo(
    () => ({
      id, date, view, range, days, events, resources, hiddenResourceIds, filterText, showWeekends,
      status, error, pendingIds, flags, settings, isCustomised,
      setDate, setView, goToday, goNext, goPrevious, setFilterText, setResourceHidden, setResourcesHidden,
      setShowWeekends, resetPreferences, reload, createEvent, updateEvent, removeEvent,
      resourceOf, colorOf,
    }),
    [
      id, date, view, range, days, events, resources, hiddenResourceIds, filterText, showWeekends,
      status, error, pendingIds, flags, settings, isCustomised, setDate, setView, goToday, goNext,
      goPrevious, setFilterText, setResourceHidden, setResourcesHidden, setShowWeekends, resetPreferences, reload,
      createEvent, updateEvent, removeEvent, resourceOf, colorOf,
    ],
  )
}
