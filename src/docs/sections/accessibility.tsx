import type { DocSection } from "../model"
import { Callout, RefTable } from "../prose"

function Keyboard() {
  return (
    <>
      <p>
        Shortcuts work while focus is inside the calendar, and never while typing in a field.
      </p>
      <RefTable
        caption="Keyboard"
        head={["Key", "Does"]}
        rows={[
          ["← →", "Previous and next period."],
          ["t", "Jump to today."],
          ["Enter, Space", "On a focused event: open the editor, or call onEventClick."],
          ["Escape", "Close the editor, the settings menu, the sidebar drawer on a phone, or an in-progress drag."],
          ["Tab, Shift+Tab", "Inside the editor, cycle within it; focus returns to where it was when it closes."],
        ]}
      />
      <Callout tone="warning">
        Drag gestures have no keyboard equivalent yet. Creating, moving and resizing by drag is pointer-only; the editor,
        reached from a focused event with Enter or from “New event”, is the keyboard path for all three.
      </Callout>
    </>
  )
}

function Semantics() {
  return (
    <ul>
      <li>
        Toolbar controls are real buttons with accessible names, <code>aria-pressed</code> where they toggle, and the
        period's title is a polite live region.
      </li>
      <li>
        Every event chip has <code>role="button"</code>, can be focused, and is named by{" "}
        <code>labels.eventDescription</code> — its name with its start and end — not a bare “button”.
      </li>
      <li>
        The editor is a <code>role="dialog"</code> with <code>aria-modal</code>: the first field takes focus, Tab stays
        inside, the page behind stops scrolling, and a validation error is announced as an alert.
      </li>
      <li>
        The month, the year and the mini month picker are <code>grid</code>s with names. The hover tooltip is a plain
        card with nothing inside it to focus.
      </li>
      <li>
        With <code>prefers-reduced-motion: reduce</code> every transition and animation under the calendar is off,
        including the loading bar.
      </li>
    </ul>
  )
}

export const accessibility: DocSection = {
  id: "accessibility",
  title: "Keyboard and accessibility",
  summary: "What the keyboard can do, what a screen reader is told, and the one gap.",
  topics: [
    { id: "keyboard", title: "Keyboard", Body: Keyboard },
    { id: "semantics", title: "Roles and names", Body: Semantics },
  ],
}
