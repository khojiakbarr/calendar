import type { CalendarInstance } from "../instance"
import type { CalendarLabels } from "../types"
import { classNames } from "../core/classNames"
import { useSlotClass } from "./classesContext"
import { MiniCalendar } from "./MiniCalendar"
import { ResourceFilter } from "./ResourceFilter"
import "../styles/sidebar.css"

export interface SidebarProps<TData = unknown> {
  instance: CalendarInstance<TData>
  labels: CalendarLabels
}

/**
 * The calendar's left rail: mini month picker, text filter, and the
 * resource (calendar) visibility list.
 *
 * A single scroll container, so a long resource list scrolls under the mini
 * calendar rather than pushing it off screen.
 */
export function Sidebar<TData = unknown>({ instance, labels }: SidebarProps<TData>) {
  const slotClass = useSlotClass("sidebar")
  return (
    <div className={classNames("cal-sidebar", slotClass)}>
      <MiniCalendar instance={instance} labels={labels} />
      <div className="cal-sidebar-filter">
        <input
          type="search"
          className="cal-input"
          aria-label={labels.filterPlaceholder}
          placeholder={labels.filterPlaceholder}
          value={instance.filterText}
          onChange={(event) => instance.setFilterText(event.target.value)}
        />
      </div>
      <ResourceFilter instance={instance} labels={labels} />
    </div>
  )
}
