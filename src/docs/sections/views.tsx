import { AgendaExample } from "../examples/AgendaExample"
import agendaSource from "../examples/AgendaExample.tsx?raw"
import { CrowdedExample } from "../examples/CrowdedExample"
import crowdedSource from "../examples/CrowdedExample.tsx?raw"
import { LiveExample } from "../LiveExample"
import type { DocSection } from "../model"
import { RefTable } from "../prose"

function FiveViews() {
  return (
    <>
      <p>
        Switch from the toolbar or with <code>instance.setView</code>; <code>initialView</code> picks the first one,
        unless the user has a stored view. ‹ › step by the view's own unit; the agenda steps by month.
      </p>
      <RefTable
        caption="The five views"
        head={["View", "Covers", "Shows"]}
        rows={[
          ["day", "One day", "A time grid, with an all-day strip above it. Drag to create, move and resize."],
          ["week", "Seven days, five without weekends", "The same grid across the days, starting on weekStartsOn."],
          ["month", "A six-week grid", "Whole-day events as bars across the cells; a timed event as a dot and a time; “+N more” past what fits."],
          ["year", "Twelve mini months", "Each day tinted by how many events touch it. Click a day to open it."],
          ["agenda", "The month, as a list", "One block per day that has events. Opens on today when the month holds it."],
        ]}
      />
      <p>
        The grid is tuned with <code>dayStartHour</code> and <code>dayEndHour</code> (a clinic can draw 08:00–18:00),{" "}
        <code>snapMinutes</code> (what a drag rounds to) and <code>defaultEventMinutes</code> (the length of a click-made
        event). Weekends can be hidden from the toolbar's ⋮ menu or with <code>setShowWeekends</code>.
      </p>
    </>
  )
}

function CrowdedHours() {
  return (
    <>
      <p>
        Six meetings at one hour would be six slivers nobody can read. A cluster of overlapping timed events therefore
        takes at most <code>maxEventColumns</code> columns — 3 by default in a week, twice that in the roomier day view —
        and the rest gather into one “+N” slot, which opens the day view from a week, or the agenda from a day. Hover
        it for the names.
      </p>
      <LiveExample
        title="A crowded hour"
        hint="Today's column holds six meetings at 9:00. Change the number, then click the +N."
        source={crowdedSource}
        file="CrowdedExample.tsx"
      >
        <CrowdedExample />
      </LiveExample>
      <p>
        The packing is exported as <code>limitColumns(layoutDay(events, day), max)</code>, for a shell of your own.
      </p>
    </>
  )
}

function Agenda() {
  return (
    <>
      <p>
        By default the agenda lists a multi-day event under every day it touches, so nothing looks like it vanished
        halfway. A three-month plan would then be ninety rows. <code>agendaSpans: "first"</code> lists it once, under
        the first shown day it touches, with its whole range as the label.
      </p>
      <LiveExample
        title="Agenda spans"
        hint="Switch between first and each; the month opens scrolled to today."
        source={agendaSource}
        file="AgendaExample.tsx"
      >
        <AgendaExample />
      </LiveExample>
    </>
  )
}

export const views: DocSection = {
  id: "views",
  title: "Views",
  summary: "Day, week, month, year and agenda, and what to do when too much happens at once.",
  topics: [
    { id: "five-views", title: "The five views", Body: FiveViews },
    { id: "crowded-hours", title: "Crowded hours", Body: CrowdedHours },
    { id: "agenda", title: "The agenda", Body: Agenda },
  ],
}
