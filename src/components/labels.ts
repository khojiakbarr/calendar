import type { CalendarLabels } from "../types"

/**
 * English labels for all calendar UI strings.
 *
 * Pass this to useCalendar or override individual keys for translations.
 */
export const defaultLabels: CalendarLabels = {
  today: "Today",
  previous: "Previous",
  next: "Next",
  day: "Day",
  week: "Week",
  month: "Month",
  year: "Year",
  agenda: "Agenda",
  weekNumber: "Week {n}",
  eventCount: "{n} events",
  newEvent: "New event",
  allDay: "All day",
  more: "+{n} more",
  noEvents: "No events",
  loading: "Loading",
  loadFailed: "Could not load events",
  retry: "Retry",
  settings: "Settings",
  showWeekends: "Show weekends",
  filterPlaceholder: "Filter events",
  resources: "Calendars",
  expandGroup: "Expand {name}",
  collapseGroup: "Collapse {name}",
  toggleSidebar: "Toggle sidebar",
  editorEditTitle: "Edit event",
  editorNewTitle: "New event",
  name: "Name",
  resource: "Calendar",
  noResource: "No calendar",
  start: "Start",
  end: "End",
  save: "Save",
  delete: "Delete",
  cancel: "Cancel",
  close: "Close",
  eventDescription: "{name}, {start} to {end}",
  untitled: "Untitled",
  endBeforeStart: "End must be after start",
  saving: "Saving",
}
