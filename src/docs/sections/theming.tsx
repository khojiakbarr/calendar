import { CodeBlock } from "../CodeBlock"
import { ThemingExample } from "../examples/ThemingExample"
import themingSource from "../examples/ThemingExample.tsx?raw"
import { LiveExample } from "../LiveExample"
import type { DocSection } from "../model"
import { Callout, ReadMore, RefTable } from "../prose"

function Tokens() {
  return (
    <>
      <p>
        Every colour and dimension is a CSS custom property with a working default, so the calendar looks finished out of
        the box and restyles without touching its source.
      </p>
      <LiveExample
        title="Tokens and the theme"
        hint="Toggle the tokens, then pin the theme to dark."
        source={themingSource}
        file="ThemingExample.tsx"
      >
        <ThemingExample />
      </LiveExample>
      <RefTable
        caption="Design tokens"
        head={["Token", "Purpose"]}
        rows={[
          ["--cal-bg", "Surface, text and muted text: --cal-bg, --cal-fg, --cal-muted-fg."],
          ["--cal-border", "Edges: --cal-border, --cal-border-strong, --cal-radius, --cal-radius-sm."],
          ["--cal-accent", "Interactive accent, with --cal-accent-soft, --cal-danger, --cal-success and --cal-neutral (the tones' colours)."],
          ["--cal-on-accent", "Text or icon drawn on a solid --cal-accent fill: today's circle, a filled heat cell."],
          ["--cal-font", "Typography: --cal-font and --cal-font-size."],
          ["--cal-header-bg", "The toolbar: --cal-header-bg, --cal-header-fg, --cal-header-height."],
          ["--cal-sidebar-bg", "The sidebar: --cal-sidebar-bg, --cal-sidebar-width."],
          ["--cal-hover-bg", "Hover and selected states: --cal-hover-bg, --cal-selected-bg."],
          ["--cal-weekend-fg", "Weekend columns and today: --cal-weekend-fg, --cal-today-fg."],
          ["--cal-hour-height", "The time grid: --cal-hour-height, --cal-gutter-width, --cal-allday-row-height."],
          ["--cal-event-radius", "Events: --cal-event-radius, --cal-event-fg, --cal-now-line."],
          ["--cal-chip-mix", "How much of an event's colour is mixed into its chip: --cal-chip-mix and --cal-chip-mix-hover."],
          ["--cal-shadow", "Elevation: --cal-shadow (popover, tooltip, editor), --cal-root-shadow, and --cal-focus-ring."],
          ["--cal-mini-cell", "The mini month picker's cell size."],
        ]}
      />
      <Callout tone="warning">
        The editor and the hover tooltip are portaled to <code>&lt;body&gt;</code>, outside the element that renders{" "}
        <code>{"<Calendar>"}</code>, so an override scoped to your own wrapper never reaches them. They carry{" "}
        <code>.cal-root</code> themselves — target that to theme every layer at once.
      </Callout>
      <CodeBlock
        language="css"
        code={`
.cal-root {
  --cal-accent: #7c3aed;
  --cal-radius: 6px;
  --cal-hour-height: 56px;
}`}
      />
    </>
  )
}

function CascadeLayer() {
  return (
    <>
      <p>
        All of the library's CSS lives in <code>@layer calendar</code>. An unlayered stylesheet beats any layered one
        whatever its specificity, so a plain <code>.css</code> file, a CSS Module or styled-components overrides a{" "}
        <code>cal-*</code> rule with no <code>!important</code>:
      </p>
      <CodeBlock language="css" code={".cal-event {\n  border-radius: 0;\n}"} />
      <p>
        Tailwind v4 puts its utilities in layers of their own, and a later layer wins a tie. To let a utility class beat
        the calendar, declare the order yourself before Tailwind registers its layers:
      </p>
      <CodeBlock language="css" code={'@layer calendar, theme, base, components, utilities;\n@import "tailwindcss";'} />
    </>
  )
}

function Classes() {
  return (
    <>
      <p>
        For the rare case a token and a plain override cannot reach — a CSS Module class, or a Tailwind utility that must
        apply directly — <code>{"<Calendar>"}</code> takes a <code>classes</code> prop. Each key adds a class beside the
        slot's own <code>cal-*</code> class and never replaces it.
      </p>
      <CodeBlock language="tsx" code={'<Calendar instance={calendar} classes={{ event: "my-event", toolbar: "my-toolbar" }} />'} />
      <p>
        Slots: <code>root</code>, <code>toolbar</code>, <code>sidebar</code>, <code>miniCalendar</code>,{" "}
        <code>resourceFilter</code>, <code>view</code>, <code>dayHeader</code>, <code>allDayRow</code>,{" "}
        <code>timeGrid</code>, <code>event</code>, <code>month</code>, <code>monthCell</code>, <code>year</code>,{" "}
        <code>agenda</code>, <code>popover</code>, <code>dialog</code>, <code>editor</code>, <code>tooltip</code>.
      </p>
    </>
  )
}

function DarkMode() {
  return (
    <>
      <p>
        The calendar follows <code>prefers-color-scheme</code>. Pass <code>theme="light"</code> or{" "}
        <code>theme="dark"</code> to pin it, for an app with a theme switch of its own. The floating layers get the same
        theme as the calendar that opened them.
      </p>
      <ReadMore anchor="styling">Styling</ReadMore>
    </>
  )
}

export const theming: DocSection = {
  id: "theming",
  title: "Theming",
  summary: "Restyle the calendar with tokens first, then plain CSS, then a class on one slot.",
  topics: [
    { id: "tokens", title: "Tokens", Body: Tokens },
    { id: "cascade-layer", title: "The cascade layer", Body: CascadeLayer },
    { id: "classes", title: "The classes prop", Body: Classes },
    { id: "dark-mode", title: "Dark mode", Body: DarkMode },
  ],
}
