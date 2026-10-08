import { CodeBlock } from "../CodeBlock"
import { QuickStartExample } from "../examples/QuickStartExample"
import quickStartSource from "../examples/QuickStartExample.tsx?raw"
import { LiveExample } from "../LiveExample"
import type { DocSection } from "../model"
import { Callout } from "../prose"

function Install() {
  return (
    <>
      <p>
        It runs on React 18 or 19 and has no other runtime dependency. Import the stylesheet once, anywhere in your app:
        every colour and size in it is a CSS custom property, so you restyle the calendar by setting tokens, not by
        overriding selectors — see <a href="#tokens">Tokens</a>.
      </p>
      <CodeBlock language="bash" code="npm i @hojiakbar_dev/calendar" />
      <CodeBlock language="ts" code={'import "@hojiakbar_dev/calendar/styles.css"'} />
    </>
  )
}

function QuickStart() {
  return (
    <>
      <p>
        <code>useCalendar</code> owns the state — the date, the view, what has been loaded, every edit — and{" "}
        <code>{"<Calendar>"}</code> draws it. This one is live: drag on empty space to draw an event, drag one to
        move it, drag its bottom edge to resize it, or click it to open the editor.
      </p>
      <LiveExample title="A first calendar" source={quickStartSource} file="QuickStartExample.tsx">
        <QuickStartExample />
      </LiveExample>
      <ul>
        <li>
          <code>id</code> is required. It is the key preferences are stored under, so two calendars on one page must
          not share one.
        </li>
        <li>
          <code>source</code> is required: where events come from and where edits go. Here it is an in-memory one; see{" "}
          <a href="#event-source">The EventSource contract</a> for a real one.
        </li>
        <li>
          Without <code>height</code> the calendar fills its parent, at least 480px tall.
        </li>
      </ul>
    </>
  )
}

function Headless() {
  return (
    <>
      <p>
        <code>{"<Calendar>"}</code> is optional. <code>useCalendar</code> returns one object — state plus every action —
        and every part the shell is made of is exported, so a different layout can keep the parts that are fiddly to
        get right (grid packing, drag-to-create, popover placement) and replace the rest.
      </p>
      <CodeBlock
        language="tsx"
        code={`
import { defaultLabels, useCalendar, Toolbar, WeekView } from "@hojiakbar_dev/calendar"

const instance = useCalendar({ id: "clinic", source })

<Toolbar instance={instance} labels={defaultLabels} sidebarOpen={false} onToggleSidebar={() => {}} />
<WeekView instance={instance} labels={defaultLabels} onEventOpen={open} onCreateRequest={create} onEventHover={hover} />`}
      />
      <p>
        Exported views: <code>DayView</code>, <code>WeekView</code>, <code>MonthView</code>, <code>YearView</code>,{" "}
        <code>AgendaView</code>. Exported chrome: <code>Toolbar</code>, <code>Sidebar</code>, <code>MiniCalendar</code>,{" "}
        <code>ResourceFilter</code>, <code>EventEditor</code>, <code>EventTooltip</code>, <code>Popover</code> and{" "}
        <code>Dialog</code>. Two pure helpers are worth borrowing: <code>layoutDay</code> packs one day's timed events
        into side-by-side columns, and <code>limitColumns</code> caps how many it draws.
      </p>
      <Callout>
        A hand-written shell receives the same <code>instance</code> as the built-in one, so nothing here is private.
      </Callout>
    </>
  )
}

export const gettingStarted: DocSection = {
  id: "getting-started",
  title: "Getting started",
  summary: "Install the package, render a first calendar, or build your own shell around the hook.",
  topics: [
    { id: "install", title: "Install", Body: Install },
    { id: "quick-start", title: "Your first calendar", Body: QuickStart },
    { id: "headless", title: "Without the shell", Body: Headless },
  ],
}
