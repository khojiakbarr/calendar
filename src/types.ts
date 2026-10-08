/** The five ways a calendar can show its events. */
export type CalendarView = "day" | "week" | "month" | "year" | "agenda"

/** A half-open interval: `start` is included, `end` is not. */
export interface DateRange {
  start: Date
  end: Date
}

/** 0 = Sunday … 6 = Saturday, as `Date.prototype.getDay()` counts. */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6

/**
 * How an event is drawn, in a Gantt chart's words: `plan` a dashed outline of
 * what was planned, `actual` what happened (the ordinary filled chip),
 * `overrun` the stretch past the plan, striped red.
 */
export type EventAppearance = "plan" | "actual" | "overrun"

/** A one-day mark rather than a stretch of time: `tick` for a limit (a due day), `dot` for a moment (a payment). */
export type EventMarker = "tick" | "dot"

/** What an event's colour means; each is a `--cal-*` token, so a host restyles all of them in one place. */
export type EventTone = "primary" | "success" | "danger" | "neutral"

/**
 * One event as the calendar sees it.
 *
 * `end` is exclusive: an event from 09:00 to 10:00 ends the instant 10:00
 * begins, and an all-day event on the 15th runs from the 15th 00:00 to the
 * 16th 00:00. Half-open intervals make "does it overlap" a single comparison
 * and let back-to-back events share a boundary without touching.
 *
 * `data` carries whatever the application attaches — a patient, a room, a
 * booking — and is passed back untouched in renderers and mutations.
 */
export interface CalendarEvent<TData = unknown> {
  id: string
  name: string
  start: Date
  end: Date
  /** Occupies whole days; shown in the all-day row rather than on the time grid. */
  allDay?: boolean
  /** The resource (calendar) this event belongs to; picks its colour. */
  resourceId?: string
  /** A CSS colour that overrides the resource colour for this event only. */
  color?: string
  /** Cannot be dragged, resized, edited or deleted. */
  readOnly?: boolean
  /** Drawn as a plan, the actual work, or the overrun past a plan. Default: an ordinary chip. */
  appearance?: EventAppearance | undefined
  /** Drawn as a one-day mark. Give the event a whole day: `allDay` with `end` the next midnight. */
  marker?: EventMarker | undefined
  /** The colour's meaning. Wins over the resource's colour, loses to `color`. */
  tone?: EventTone | undefined
  /** Extra classes on the chip, for a look the host defines in its own stylesheet. */
  className?: string | undefined
  /**
   * Events that are dates of one record share it — a step's plan, its actual
   * work and its deadline. Pointing at one lights up the others.
   */
  groupId?: string | undefined
  data?: TData
}

/**
 * A calendar within the calendar: a person, a room, a team.
 *
 * Every event may belong to one, takes its colour, and can be hidden with it
 * from the sidebar.
 */
export interface CalendarResource {
  id: string
  name: string
  /** Any CSS colour. */
  color: string
}

/** A new event, before the server has given it an id. */
export type EventDraft<TData = unknown> = Omit<CalendarEvent<TData>, "id">

/** The fields of an event that changed. */
export type EventPatch<TData = unknown> = Partial<EventDraft<TData>>

/**
 * Where events come from and where edits go.
 *
 * This is the server-side contract. The calendar asks for the visible range —
 * never the whole table — and hands every edit back as it happens. It applies
 * each edit optimistically and rolls it back if the promise rejects, so the
 * server stays the source of truth without the UI waiting on it.
 *
 * Only `load` is required. Leave a mutation out and the matching gesture is
 * simply not offered: no `remove` means no Delete button.
 *
 * Recurring events are the server's job: expand them into occurrences for the
 * requested range and return those. The calendar never needs to know.
 */
export interface EventSource<TData = unknown> {
  /**
   * @param range - The interval to fetch; return every event that overlaps it.
   * @param options - `signal` aborts when the user has already moved on.
   */
  load(range: DateRange, options: { signal: AbortSignal }): Promise<CalendarEvent<TData>[]>
  /** @returns The event as stored, with its server-assigned id. */
  create?(draft: EventDraft<TData>): Promise<CalendarEvent<TData>>
  /**
   * @param id - The event being changed.
   * @param patch - Only the fields that changed.
   * @param previous - The event before the change, for servers that want it.
   * @returns The event as stored after the change.
   */
  update?(id: string, patch: EventPatch<TData>, previous: CalendarEvent<TData>): Promise<CalendarEvent<TData>>
  remove?(id: string): Promise<void>
}

/** Which mutation was running when a source rejected. */
export type EventSourceAction = "load" | "create" | "update" | "remove"

/** Whether the server is being asked for events right now. */
export type LoadStatus = "idle" | "loading" | "error"

/**
 * Everything a user can set about a calendar that is worth keeping.
 *
 * The anchor date is deliberately not here: reopening a calendar on the day
 * someone last looked at, weeks ago, is a surprise, not a convenience.
 */
export interface CalendarPreferences {
  view: CalendarView
  showWeekends: boolean
  hiddenResourceIds: string[]
}

/**
 * Where preferences are kept between visits.
 *
 * Same shape as the data-table's layout storage: keyed by the calendar `id`,
 * so one adapter serves every calendar in an application.
 */
export interface PreferenceStorage {
  /** @returns The stored preferences, or null when never customised. */
  load(id: string): Partial<CalendarPreferences> | null
  save(id: string, preferences: CalendarPreferences): void
  clear(id: string): void
}

/** Which gestures the user is offered. Each also needs its source method. */
export interface CalendarFeatureFlags {
  /** Drag on empty space, or double-click it, to add an event. Default true. */
  create?: boolean
  /** Drag an event to another time or day. Default true. */
  move?: boolean
  /** Drag an event's bottom edge to change its end. Default true. */
  resize?: boolean
  /** Open the editor from an event. Default true. */
  edit?: boolean
  /** Delete from the editor. Default true. */
  remove?: boolean
}

/** Text shown in the built-in shell, for translation. */
export interface CalendarLabels {
  today: string
  previous: string
  next: string
  day: string
  week: string
  month: string
  year: string
  agenda: string
  /** `{n}` is replaced with the week number. */
  weekNumber: string
  /** `{n}` is replaced with the number of events. */
  eventCount: string
  newEvent: string
  allDay: string
  /** `{n}` is replaced with how many events did not fit. */
  more: string
  noEvents: string
  loading: string
  loadFailed: string
  retry: string
  settings: string
  showWeekends: string
  filterPlaceholder: string
  resources: string
  toggleSidebar: string
  editorEditTitle: string
  editorNewTitle: string
  name: string
  resource: string
  noResource: string
  start: string
  end: string
  save: string
  delete: string
  cancel: string
  close: string
  /** Read out for an event: `{name}`, `{start}` and `{end}` are replaced. */
  eventDescription: string
  untitled: string
  /** Validation message when end is not after start. */
  endBeforeStart: string
  saving: string
}
