import { useEffect } from "react"
import type { CalendarInstance } from "../instance"
import type { CalendarLabels } from "../types"
import { classNames } from "../core/classNames"
import { useSlotClass } from "./classesContext"
import { MiniCalendar } from "./MiniCalendar"
import { ResourceFilter } from "./ResourceFilter"
import { useMediaQuery } from "./useMediaQuery"
import "../styles/sidebar.css"

/** Below this width the sidebar renders as an overlay drawer instead of a permanent rail — matches sidebar.css. */
const NARROW_QUERY = "(max-width: 900px)"

export interface SidebarProps<TData = unknown> {
  instance: CalendarInstance<TData>
  labels: CalendarLabels
  /**
   * Called when the drawer should close: the scrim is clicked, Escape is
   * pressed, or the header's close button is clicked. Only meaningful at the
   * ≤900px breakpoint where the sidebar becomes an overlay drawer — omit it
   * and those gestures simply do nothing.
   */
  onClose?: () => void
}

/**
 * The calendar's left rail: mini month picker, text filter, and the
 * resource (calendar) visibility list.
 *
 * A single scroll container, so a long resource list scrolls under the mini
 * calendar rather than pushing it off screen.
 *
 * At ≤900px it renders as an overlay drawer instead of a permanent rail: a
 * `.cal-sidebar-scrim` sibling covers `.cal-body` behind it, and clicking
 * the scrim, pressing Escape, or clicking the header's close button all call
 * `onClose`.
 */
export function Sidebar<TData = unknown>({ instance, labels, onClose }: SidebarProps<TData>) {
  const slotClass = useSlotClass("sidebar")
  const isNarrow = useMediaQuery(NARROW_QUERY)

  useEffect(() => {
    if (!isNarrow) return
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose?.()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isNarrow, onClose])

  return (
    <>
      <div className={classNames("cal-sidebar", slotClass)}>
        <div className="cal-sidebar-header">
          <button type="button" className="cal-icon-btn cal-sidebar-close" aria-label={labels.close} onClick={() => onClose?.()}>
            <CloseIcon />
          </button>
        </div>
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
      {isNarrow ? <div className="cal-sidebar-scrim" aria-hidden="true" onClick={() => onClose?.()} /> : null}
    </>
  )
}

/** The drawer's close glyph, shown in the sidebar header only at ≤900px. */
function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
