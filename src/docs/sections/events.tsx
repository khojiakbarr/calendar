import { CodeBlock } from "../CodeBlock"
import { LooksExample } from "../examples/LooksExample"
import looksSource from "../examples/LooksExample.tsx?raw"
import { RecordDatesExample } from "../examples/RecordDatesExample"
import recordSource from "../examples/RecordDatesExample.tsx?raw"
import { LiveExample } from "../LiveExample"
import type { DocSection } from "../model"
import { RefTable } from "../prose"

function EventShape() {
  return (
    <>
      <p>
        An event is <code>{"{ id, name, start, end }"}</code> and some optional fields. <code>end</code> is{" "}
        <strong>exclusive</strong>: 09:00–10:00 ends the instant 10:00 begins, so two back-to-back events touch without
        overlapping. A whole-day event on the 15th runs from the 15th at 00:00 to the 16th at 00:00 with{" "}
        <code>allDay: true</code> — not to 23:59.
      </p>
      <p>
        <code>data</code> carries whatever your application attaches (a patient, a room, a booking) and is passed back
        untouched in mutations. <code>resourceId</code> files the event under a <a href="#resources">resource</a>, which
        gives it a colour; <code>color</code> overrides that for one event.
      </p>
    </>
  )
}

function Looks() {
  return (
    <>
      <p>
        An event can be drawn the way a Gantt chart draws work, so one record can put any number of dates on the
        calendar and each reads for what it is.
      </p>
      <RefTable
        caption="Event looks"
        head={["Field", "Values", "Drawn as"]}
        rows={[
          ["appearance", <><code>plan</code> · <code>actual</code> · <code>overrun</code></>, "A dashed outline · the ordinary filled chip · the stretch past the plan, striped red."],
          ["marker", <><code>tick</code> · <code>dot</code></>, "A one-day mark: a bar for a limit (a due day), a dot for a moment (a payment). Give it a whole day."],
          ["tone", <><code>primary</code> · <code>success</code> · <code>danger</code> · <code>neutral</code></>, "What the colour means. Each is a token, so a host restyles all of them in one place."],
          ["className", "any", "Extra classes on the chip, for a look you define in your own stylesheet."],
        ]}
      />
      <LiveExample
        title="One project step"
        hint="A plan, the work, two days of overrun, a deadline tick and a payment dot. The week view stacks them in the all-day strip."
        source={looksSource}
        file="LooksExample.tsx"
      >
        <LooksExample />
      </LiveExample>
      <p>
        An overrun is drawn in <code>danger</code> unless it names a tone of its own. A <code>color</code> wins over a
        tone, and a tone over the resource's colour. <code>appearance</code> and <code>marker</code> shape the chips that
        are bars: the time grid's, the all-day strip's, the month's whole-day spans and the agenda's spans. A single-day
        timed event in the month or the agenda stays a dot and a time.
      </p>
      <CodeBlock
        language="css"
        code={`
/* For an event with className: "is-late" — in your own stylesheet, which wins without !important. */
.is-late { font-weight: 700; }`}
      />
    </>
  )
}

function RecordDates() {
  return (
    <>
      <p>
        Dates that belong to one record share a <code>groupId</code>. Pointing at any of them draws an outline around the
        others, in the day, week and month views, so a step's plan, its work and its deadline read as one thing even
        when they are weeks apart.
      </p>
      <LiveExample
        title="A record's dates light together"
        hint="Hover the plan of either record: its due tick and the payment dot a week later light up."
        source={recordSource}
        file="RecordDatesExample.tsx"
      >
        <RecordDatesExample />
      </LiveExample>
    </>
  )
}

export const events: DocSection = {
  id: "events",
  title: "Events and looks",
  summary: "The shape of an event, and how one record can show many dates, each as what it is.",
  topics: [
    { id: "event-shape", title: "The shape of an event", Body: EventShape },
    { id: "looks", title: "Looks", Body: Looks },
    { id: "record-dates", title: "One record, many dates", Body: RecordDates },
  ],
}
