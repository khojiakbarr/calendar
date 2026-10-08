import { CodeBlock } from "../CodeBlock"
import { ClockAndClickExample } from "../examples/ClockAndClickExample"
import clockSource from "../examples/ClockAndClickExample.tsx?raw"
import { LiveExample } from "../LiveExample"
import type { DocSection } from "../model"
import { Callout, ReadMore } from "../prose"

function EventClick() {
  return (
    <>
      <p>
        With <code>onEventClick</code> the calendar's own editor never opens for an event: your app opens its page or
        its dialog instead. Creating by drag is unaffected, so keep it off with <code>features.create</code> if the
        click should also own that.
      </p>
      <CodeBlock language="tsx" code={"<Calendar instance={calendar} onEventClick={(event, chip) => navigate(`/tasks/${event.id}`)} />"} />
      <p>
        The second argument is the chip element, for anchoring a popover of your own to it. It fires once per click —
        a double-click does not call it twice.
      </p>
    </>
  )
}

function HostClock() {
  return (
    <>
      <p>
        The calendar asks <code>now</code> what time it is: for the day drawn as today, the now-line, the “Today” button
        and the day it opens on. The default is the browser's clock.
      </p>
      <Callout tone="warning">
        The calendar reads the <strong>local fields</strong> (year … minute) of the Date <code>now</code> returns, exactly
        as it reads every event's <code>start</code> and <code>end</code>. A host that draws a zone other than the
        browser's shifts both alike: each event, and now, become Dates whose local fields are that zone's wall clock.
        10:00 in Tashkent is <code>new Date(y, m, d, 10, 0)</code> whatever zone the browser is in.
      </Callout>
      <LiveExample
        title="A host's clock and a host's click"
        hint="Change the zone and the now-line moves. Click an event: the host answers, the editor stays shut."
        source={clockSource}
        file="ClockAndClickExample.tsx"
      >
        <ClockAndClickExample />
      </LiveExample>
      <p>
        An inline function is fine: the calendar reads <code>now</code> through a ref, so a new one on every render costs
        nothing.
      </p>
    </>
  )
}

function Preferences() {
  return (
    <>
      <p>
        Nothing is stored by default. Pass <code>storage</code> to keep the view, whether weekends show and which
        resources are hidden, per calendar <code>id</code>:
      </p>
      <CodeBlock
        language="tsx"
        code={`
import { localStoragePreferences } from "@hojiakbar_dev/calendar"

useCalendar({ id: "clinic", source, storage: localStoragePreferences() })`}
      />
      <p>
        For preferences that follow a user across devices, pass any object with <code>load</code>, <code>save</code> and{" "}
        <code>clear</code>. <code>load</code> runs once on mount and must be synchronous, so fetch the preferences with
        the rest of your page data and read them from a cache here. <code>save</code> is debounced: it runs a short
        while after the last change, never on mount, so switching views three times writes once.
      </p>
      <CodeBlock
        language="tsx"
        code={`
const serverPreferences: PreferenceStorage = {
  load: (id) => cache.get(id) ?? null,
  save: (id, preferences) => { void fetch(\`/api/calendar-preferences/\${id}\`, { method: "PUT", body: JSON.stringify(preferences) }) },
  clear: (id) => { void fetch(\`/api/calendar-preferences/\${id}\`, { method: "DELETE" }) },
}`}
      />
      <p>
        The anchor date is deliberately not stored: reopening a calendar on the day someone last looked at, weeks ago, is
        a surprise rather than a convenience. <code>initialPreferences</code> sets what a first visit sees, and loses to
        anything stored; <code>resetPreferences()</code> goes back to it.
      </p>
      <ReadMore anchor="preferences">Preferences</ReadMore>
    </>
  )
}

export const host: DocSection = {
  id: "in-your-app",
  title: "In your app",
  summary: "Let your app decide what a click does and what time it is, and keep what the user chose.",
  topics: [
    { id: "event-click", title: "Opening a record yourself", Body: EventClick },
    { id: "host-clock", title: "A host's clock", Body: HostClock },
    { id: "preferences", title: "Preferences and storage", Body: Preferences },
  ],
}
