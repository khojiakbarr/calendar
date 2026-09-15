import type { CSSProperties } from "react"
import type { CalendarInstance } from "../instance"
import type { CalendarLabels } from "../types"
import { classNames } from "../core/classNames"
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
      {instance.resources.map((resource) => {
        const checked = !instance.hiddenResourceIds.includes(resource.id)
        return (
          <label key={resource.id} className="cal-resource-row" style={resourceColorStyle(resource.color)}>
            <input
              type="checkbox"
              className="cal-checkbox"
              checked={checked}
              onChange={(event) => instance.setResourceHidden(resource.id, !event.target.checked)}
            />
            <span className="cal-resource-name">{resource.name}</span>
          </label>
        )
      })}
    </div>
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
