import type { DocSection } from "../model"
import { RefTable } from "../prose"

const code = (text: string) => <code>{text}</code>

function Options() {
  return (
    <RefTable
      caption="useCalendar options"
      head={["Option", "Type", "Default", ""]}
      rows={[
        ["id", code("string"), "—", "Required. Unique per application; the preferences storage key."],
        ["source", code("EventSource<TData>"), "—", "Required. See The EventSource contract."],
        ["resources", code("CalendarResource[]"), code("[]"), "Colours and the sidebar filter."],
        ["initialDate", code("Date"), "today", "The day first shown."],
        ["initialView", code("CalendarView"), code('"week"'), "Ignored once a user has a stored view."],
        ["storage", code("PreferenceStorage"), "none", "Where preferences live between visits."],
        ["initialPreferences", code("Partial<CalendarPreferences>"), code("{}"), "Applied on a first visit; loses to anything stored."],
        ["features", code("CalendarFeatureFlags"), "all on", "Turn off create, move, resize, edit or remove. Each still needs its source method."],
        ["weekStartsOn", code("WeekDay"), code("1"), "Date.getDay() numbering."],
        ["locale", code("string"), "browser's", "BCP 47 tag for Intl."],
        ["dayStartHour", code("number"), code("0"), "First hour drawn on the time grid."],
        ["dayEndHour", code("number"), code("24"), "Hour boundary the time grid ends at."],
        ["snapMinutes", code("number"), code("15"), "Drag gestures round to this many minutes."],
        ["defaultEventMinutes", code("number"), code("60"), "Length of an event created with a click."],
        ["now", code("() => Date"), "browser's clock", "What now is. Reads the local fields; see A host's clock."],
        ["maxEventColumns", code("number"), code("3"), "Columns a cluster of overlapping timed events takes in a week (twice that in the day view) before a +N."],
        ["agendaSpans", code('"each" | "first"'), code('"each"'), "List a multi-day event under every day it touches, or once under the first."],
        ["onError", code("(error, action) => void"), "—", "Told about every rejection, with the action that caused it."],
      ]}
    />
  )
}

function Props() {
  return (
    <RefTable
      caption="Calendar props"
      head={["Prop", "Type", "Default", ""]}
      rows={[
        ["instance", code("CalendarInstance<TData>"), "—", "Required. From useCalendar."],
        ["labels", code("Partial<CalendarLabels>"), "English", "Every string, for translation."],
        ["theme", code('"light" | "dark"'), "system", "Pins the chrome; omit to follow the OS."],
        ["className", code("string"), "—", "Added to the root element."],
        ["classes", code("CalendarClasses"), "—", "Adds a class to one named slot."],
        ["sidebar", code("boolean"), code("true"), "Whether the sidebar can be shown at all."],
        ["height", code("number | string"), "fills parent", "CSS height of the root (minimum 480px when omitted)."],
        ["editorPresentation", code('"modal" | "sheet" | "auto"'), code('"auto"'), "A sheet under 640px, a centred modal otherwise."],
        ["onEventClick", code("(event, chip) => void"), "—", "A click or Enter on an event. Given, the editor never opens."],
      ]}
    />
  )
}

function InstanceFields() {
  return (
    <RefTable
      caption="CalendarInstance"
      head={["Field", "Type", ""]}
      rows={[
        ["date, view, range, days", code("Date, CalendarView, DateRange, Date[]"), "The anchor, the view, what it covers (a month is its 6-week grid) and its day cells."],
        ["events", code("CalendarEvent[]"), "Overlapping range, after the resource and text filters, sorted by start."],
        ["resources, hiddenResourceIds", code("CalendarResource[], string[]"), "The resources and which are hidden."],
        ["status, error", code('"idle" | "loading" | "error", unknown'), "Whether the server is being asked, and the last load's rejection."],
        ["pendingIds", code("ReadonlySet<string>"), "Ids with a create, update or remove in flight."],
        ["flags, settings", code("…"), "Gestures already combined with what the source can do; the fixed configuration."],
        ["setDate, setView, goToday, goNext, goPrevious", code("(…) => void"), "Navigation."],
        ["setFilterText, setShowWeekends, setResourceHidden, setResourcesHidden, resetPreferences", code("(…) => void"), "Filters and preferences."],
        ["reload", code("() => void"), "Forgets every cached range and fetches the visible one again."],
        ["createEvent, updateEvent, removeEvent", code("Promise<…>"), "Optimistic edits; they resolve to null, null and false when the source rejected."],
        ["resourceOf, colorOf", code("(event) => …"), "An event's resource, and its resolved colour."],
      ]}
    />
  )
}

function EventFields() {
  return (
    <RefTable
      caption="CalendarEvent and CalendarResource"
      head={["Field", "Type", ""]}
      rows={[
        ["id, name", code("string"), "Required."],
        ["start, end", code("Date"), "Required. end is exclusive."],
        ["allDay", code("boolean"), "Occupies whole days; shown in the all-day strip."],
        ["resourceId", code("string"), "The resource this event belongs to; picks its colour."],
        ["color", code("string"), "A CSS colour for this event only. Wins over tone and resource."],
        ["readOnly", code("boolean"), "Cannot be dragged, resized, edited or deleted."],
        ["appearance", code('"plan" | "actual" | "overrun"'), "Dashed, ordinary, or striped red."],
        ["marker", code('"tick" | "dot"'), "Drawn as a one-day mark."],
        ["tone", code('"primary" | "success" | "danger" | "neutral"'), "The colour's meaning."],
        ["className", code("string"), "Extra classes on the chip."],
        ["groupId", code("string"), "Dates of one record share it; pointing at one lights the others."],
        ["data", code("TData"), "Whatever you attach; passed back untouched."],
        ["resource: id, name, color", code("string"), "A calendar within the calendar. color is any CSS colour."],
        ["resource: group", code("string"), "The sidebar heading it is filed under; a group shows and hides together."],
      ]}
    />
  )
}

export const apiReference: DocSection = {
  id: "api",
  title: "API reference",
  summary: "Every option, prop and field. The types themselves ship with the package.",
  topics: [
    { id: "use-calendar", title: "useCalendar options", Body: Options },
    { id: "calendar-props", title: "Calendar props", Body: Props },
    { id: "calendar-instance", title: "CalendarInstance", Body: InstanceFields },
    { id: "event-fields", title: "CalendarEvent and CalendarResource", Body: EventFields },
  ],
}
