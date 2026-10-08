import { useId, type CSSProperties } from "react"
import type { CalendarInstance } from "../instance"
import type { CalendarLabels, CalendarResource } from "../types"
import { classNames } from "../core/classNames"
import { groupResources } from "../core/resourceGroups"
import { useSlotClass } from "./classesContext"

export interface ResourceFilterProps<TData = unknown> {
  instance: CalendarInstance<TData>
  labels: CalendarLabels
}

/**
 * The sidebar's list of resources (calendars), each togglable with a
 * checkbox coloured to match.
 *
 * Renders nothing when the calendar has no resources, rather than an empty
 * "Calendars" heading over nothing — a section with no content is not worth
 * the vertical space it would otherwise claim in the sidebar.
 */
export function ResourceFilter<TData = unknown>({ instance, labels }: ResourceFilterProps<TData>) {
  // Read before the early return below: hooks must run unconditionally on every render.
  const slotClass = useSlotClass("resourceFilter")
  if (instance.resources.length === 0) return null

  return (
    <div className={classNames("cal-resources", slotClass)}>
      <span className="cal-resources-heading">{labels.resources}</span>
      {groupResources(instance.resources).map(({ group, resources }) =>
        group === null ? (
          resources.map((resource) => <ResourceRow key={resource.id} resource={resource} instance={instance} />)
        ) : (
          <GroupSection key={group} group={group} resources={resources} instance={instance} />
        ),
      )}
    </div>
  )
}

/**
 * One group: its own checkbox, then its members. The section is named by the
 * group's label rather than by a second copy of the text, so a screen reader
 * hears the name once.
 */
function GroupSection<TData>({
  group,
  resources,
  instance,
}: {
  group: string
  resources: CalendarResource[]
  instance: CalendarInstance<TData>
}) {
  const nameId = useId()
  return (
    <div className="cal-resource-group" role="group" aria-labelledby={nameId}>
      <GroupRow group={group} nameId={nameId} resources={resources} instance={instance} />
      {resources.map((resource) => (
        <ResourceRow key={resource.id} resource={resource} instance={instance} />
      ))}
    </div>
  )
}

/** One resource's checkbox, coloured to match its events. */
function ResourceRow<TData>({ resource, instance }: { resource: CalendarResource; instance: CalendarInstance<TData> }) {
  const checked = !instance.hiddenResourceIds.includes(resource.id)
  return (
    <label className="cal-resource-row" style={resourceColorStyle(resource.color)}>
      <input
        type="checkbox"
        className="cal-checkbox"
        checked={checked}
        onChange={(event) => instance.setResourceHidden(resource.id, !event.target.checked)}
      />
      <span className="cal-resource-name">{resource.name}</span>
    </label>
  )
}

/**
 * A group's own checkbox: ticked while every member shows, mixed while some
 * do. A click shows the whole group, or hides it when all of it already shows.
 */
function GroupRow<TData>({
  group,
  nameId,
  resources,
  instance,
}: {
  group: string
  nameId: string
  resources: CalendarResource[]
  instance: CalendarInstance<TData>
}) {
  const shown = resources.filter((resource) => !instance.hiddenResourceIds.includes(resource.id)).length
  const isAllShown = shown === resources.length
  const ids = resources.map((resource) => resource.id)
  return (
    <label className="cal-resource-row cal-resource-group-row">
      <input
        type="checkbox"
        className="cal-checkbox"
        checked={isAllShown}
        ref={(input) => {
          // `indeterminate` exists only as a DOM property, never as an attribute React could set.
          if (input) input.indeterminate = shown > 0 && !isAllShown
        }}
        onChange={() => instance.setResourcesHidden(ids, isAllShown)}
      />
      <span id={nameId} className="cal-resource-name">
        {group}
      </span>
    </label>
  )
}

/**
 * Exposes `color` as the `--cal-event-color` custom property so `.cal-checkbox`'s
 * `accent-color: var(--cal-event-color, ...)` picks it up.
 *
 * React's `CSSProperties` has no index signature for arbitrary custom
 * properties, so the cast is unavoidable here rather than a shortcut around
 * real type narrowing.
 */
function resourceColorStyle(color: string): CSSProperties {
  return { "--cal-event-color": color } as CSSProperties
}
