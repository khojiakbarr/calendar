import "./styles/index.css"

/* The batteries-included shell. */
export { Calendar } from "./components/Calendar"
export type { CalendarProps } from "./components/Calendar"
export { defaultLabels } from "./components/labels"
export type { CalendarClasses, CalendarSlot } from "./components/classesContext"

/* The behaviour, for a shell of your own. */
export { useCalendar } from "./useCalendar"
export type { UseCalendarOptions } from "./useCalendar"

/* Domain types: events, resources, preferences, the server contract, and
   what `useCalendar` hands back to whatever renders it. */
export type {
  CalendarEvent,
  CalendarFeatureFlags,
  CalendarLabels,
  CalendarPreferences,
  CalendarResource,
  CalendarView,
  DateRange,
  EventDraft,
  EventPatch,
  EventSource,
  EventSourceAction,
  EventAppearance,
  EventMarker,
  EventTone,
  LoadStatus,
  PreferenceStorage,
  WeekDay,
} from "./types"
export type { CalendarInstance, CalendarSettings } from "./instance"

/*
 * The shell's own parts. Exported so a different layout can reuse the
 * pieces that are fiddly to get right — grid packing, drag-to-create,
 * popover placement — instead of reimplementing them around a bespoke shell.
 */
export { Toolbar } from "./components/Toolbar"
export { Sidebar } from "./components/Sidebar"
export { MiniCalendar } from "./components/MiniCalendar"
export { ResourceFilter } from "./components/ResourceFilter"
export { DayView } from "./components/views/DayView"
export { WeekView } from "./components/views/WeekView"
export { MonthView } from "./components/views/MonthView"
export { YearView } from "./components/views/YearView"
export { AgendaView } from "./components/views/AgendaView"
export { TimeGrid } from "./components/views/TimeGrid"

/* Floating layers: the modal/sheet the editor opens in, the anchored-popover
   primitive (still used headlessly, e.g. for a menu), the editor itself, and
   the read-only hover card. */
export { Dialog } from "./components/Dialog"
export type { DialogPresentation, DialogProps } from "./components/Dialog"
export { Popover } from "./components/Popover"
export type { AnchorRect } from "./components/Popover"
export { EventEditor } from "./components/EventEditor"
export { EventTooltip } from "./components/EventTooltip"
export { useHoverIntent } from "./components/useHoverIntent"
export type { HoverIntent, HoverTarget } from "./components/useHoverIntent"

/* Helpers worth borrowing rather than rewriting. */
export { localStoragePreferences, noPreferenceStorage, prunePreferences } from "./core/persistence"
export {
  formatTime,
  formatTimeRange,
  formatTitle,
  formatWeekday,
  formatMonth,
  formatDayMonth,
  formatFullDate,
} from "./core/format"
export { eventLookClasses, TONE_COLOR, toneOf } from "./core/looks"
export { groupResources } from "./core/resourceGroups"
export type { ResourceGroup } from "./core/resourceGroups"
export { layoutDay } from "./core/layout"
export type { TimedBlock } from "./core/layout"
export { layoutSegments, limitRows } from "./core/spans"
export type { Segment } from "./core/spans"
export {
  startOfDay,
  addDays,
  addMinutes,
  startOfWeek,
  isSameDay,
  eachDay,
  overlaps,
  spansWholeDays,
  isoWeek,
} from "./core/date"
