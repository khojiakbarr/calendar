import type {
  CalendarEvent,
  CalendarFeatureFlags,
  CalendarResource,
  CalendarView,
  DateRange,
  EventDraft,
  EventPatch,
  LoadStatus,
  WeekDay,
} from "./types"

/** Fixed configuration the views read; set once through `useCalendar` options. */
export interface CalendarSettings {
  weekStartsOn: WeekDay
  /** BCP 47 tag for `Intl`; defaults to the browser's. */
  locale: string
  /** First hour drawn on the time grid. Default 0. */
  dayStartHour: number
  /** Hour boundary the time grid ends at. Default 24. */
  dayEndHour: number
  /** Drag and create gestures round to this many minutes. Default 15. */
  snapMinutes: number
  /** Length of an event created with a click. Default 60. */
  defaultEventMinutes: number
  /**
   * What "now" is: the day highlighted as today, the now-line, «Today», and
   * the day a calendar opens on. Default `() => new Date()`. A host whose
   * users live in another zone than their browser passes its own.
   */
  now: () => Date
}

/**
 * What `useCalendar` returns: state plus every action the shell can take.
 *
 * Views and the toolbar receive this object and nothing else, so a custom
 * shell built on the hook has the same surface as the built-in one.
 */
export interface CalendarInstance<TData = unknown> {
  id: string
  /** The anchor date: the day shown, or a day inside the week/month/year shown. */
  date: Date
  view: CalendarView
  /** The interval the current view covers; for `month` that is its 6-week grid. */
  range: DateRange
  /**
   * The days drawn as columns or cells, in order. Weekends are already removed
   * when `showWeekends` is false. Empty for the year view.
   */
  days: Date[]
  /** Events overlapping `range` after the resource and text filters, sorted by start. */
  events: CalendarEvent<TData>[]
  resources: CalendarResource[]
  hiddenResourceIds: readonly string[]
  filterText: string
  showWeekends: boolean
  status: LoadStatus
  /** The rejection from the last failed load, if any. */
  error: unknown
  /** Ids of events with a create, update or remove still in flight. */
  pendingIds: ReadonlySet<string>
  /** Feature flags already combined with what the source can do. */
  flags: Required<CalendarFeatureFlags>
  settings: CalendarSettings
  /** True once the user has changed a preference since the stored one loaded. */
  isCustomised: boolean

  setDate(date: Date): void
  setView(view: CalendarView): void
  goToday(): void
  goNext(): void
  goPrevious(): void
  setFilterText(text: string): void
  setResourceHidden(resourceId: string, hidden: boolean): void
  setShowWeekends(show: boolean): void
  resetPreferences(): void
  /** Forget every cached range and fetch the visible one again. */
  reload(): void
  /** @returns The stored event, or null when the source rejected (the draft is rolled back). */
  createEvent(draft: EventDraft<TData>): Promise<CalendarEvent<TData> | null>
  /** @returns The stored event, or null when the source rejected (the patch is rolled back). */
  updateEvent(id: string, patch: EventPatch<TData>): Promise<CalendarEvent<TData> | null>
  /** @returns False when the source rejected (the event is restored). */
  removeEvent(id: string): Promise<boolean>
  resourceOf(event: CalendarEvent<TData>): CalendarResource | undefined
  /** The event's own colour, else its tone's, else its resource's, else the accent. */
  colorOf(event: CalendarEvent<TData>): string
}
