import { CodeBlock } from "../CodeBlock"
import { ResourcesExample } from "../examples/ResourcesExample"
import resourcesSource from "../examples/ResourcesExample.tsx?raw"
import { LiveExample } from "../LiveExample"
import type { DocSection } from "../model"

function Resources() {
  return (
    <>
      <p>
        A resource is a calendar within the calendar — a person, a room, a team — as{" "}
        <code>{"{ id, name, color }"}</code>. Pass the list as <code>resources</code>; an event opts in with{" "}
        <code>resourceId</code>. The sidebar gives each one a checkbox in its colour, and{" "}
        <code>instance.setResourceHidden(id, hidden)</code> drives the same switch.
      </p>
      <p>
        <code>instance.colorOf(event)</code> resolves an event's colour: its own <code>color</code>, else its{" "}
        <code>tone</code>'s, else its resource's, else the accent. Hidden ids are saved with the other{" "}
        <a href="#preferences">preferences</a>, and an id that no longer names a resource is dropped when they load, so
        an old entry can never hide something that has been removed.
      </p>
    </>
  )
}

function GroupedResources() {
  return (
    <>
      <p>
        Give resources a <code>group</code> and the sidebar files them under a heading with a checkbox of its own:
        ticked while all of the group shows, mixed while part of it does, and one click shows or hides the whole group.
        Resources with no group (or a blank one) come first, without a heading; groups follow in the order their first
        resource appears.
      </p>
      <LiveExample
        title="Grouped resources"
        hint="Untick Rooms, or press a button — both go through setResourcesHidden."
        source={resourcesSource}
        file="ResourcesExample.tsx"
      >
        <ResourcesExample />
      </LiveExample>
      <CodeBlock language="ts" code={"instance.setResourcesHidden(ids, true) // several resources in one change"} />
    </>
  )
}

export const resources: DocSection = {
  id: "resources",
  title: "Resources",
  summary: "Colour events by who or what they belong to, and let people filter by it.",
  topics: [
    { id: "resource-basics", title: "Colour and visibility", Body: Resources },
    { id: "grouped-resources", title: "Grouped filter", Body: GroupedResources },
  ],
}
