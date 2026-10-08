import { CodeBlock } from "../CodeBlock"
import { LabelsExample } from "../examples/LabelsExample"
import labelsSource from "../examples/LabelsExample.tsx?raw"
import { LiveExample } from "../LiveExample"
import type { DocSection } from "../model"
import { Callout } from "../prose"

function Labels() {
  return (
    <>
      <p>
        Two settings, and they are independent. <code>locale</code> (on <code>useCalendar</code>, a BCP 47 tag, the
        browser's language by default) names the dates — the month in the title, the weekdays, the times.{" "}
        <code>labels</code> (on <code>{"<Calendar>"}</code>) names the controls. Pass only the keys that differ; the rest
        fall back to <code>defaultLabels</code>.
      </p>
      <LiveExample title="Translated controls and dates" source={labelsSource} file="LabelsExample.tsx">
        <LabelsExample />
      </LiveExample>
      <p>
        Some labels are templates: <code>weekNumber</code>, <code>eventCount</code> and <code>more</code> take{" "}
        <code>{"{n}"}</code>, and <code>eventDescription</code> — read out for every chip as its accessible name — takes{" "}
        <code>{"{name}"}</code>, <code>{"{start}"}</code> and <code>{"{end}"}</code>. The full list is{" "}
        <code>CalendarLabels</code>.
      </p>
      <CodeBlock
        language="tsx"
        code={`
<Calendar
  instance={calendar}
  labels={{ today: "Bugun", more: "yana {n}", eventDescription: "{name}, {start} dan {end} gacha" }}
/>`}
      />
    </>
  )
}

function WeekStart() {
  return (
    <>
      <p>
        <code>weekStartsOn</code> uses <code>Date.getDay()</code> numbering — <code>0</code> is Sunday, the default{" "}
        <code>1</code> is Monday. It sets the first column of the week view and of every month grid.
      </p>
      <Callout>
        Chrome ships no Latin Uzbek date names: <code>Intl</code> there answers “M10” for October. Where the engine has
        none, the calendar falls back to built-in CLDR names for <code>uz</code>, <code>uz-Latn</code> and{" "}
        <code>uz-UZ</code> (“Oktabr 2026”, “payshanba”). Cyrillic Uzbek and every other language are left to the browser.
      </Callout>
    </>
  )
}

export const labels: DocSection = {
  id: "labels",
  title: "Labels and languages",
  summary: "Translate the controls, name the dates in the user's language, and start the week where they do.",
  topics: [
    { id: "translate", title: "labels and locale", Body: Labels },
    { id: "week-start", title: "Week start and Uzbek", Body: WeekStart },
  ],
}
