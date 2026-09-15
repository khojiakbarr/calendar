import type { CalendarInstance } from "../instance"
import type { CalendarLabels } from "../types"
import { classNames } from "../core/classNames"
import { formatTitle } from "../core/format"
import { isoWeek } from "../core/date"
import { fill } from "../core/labels"
import { useSlotClass } from "./classesContext"
import { ToolbarSettingsMenu } from "./ToolbarSettingsMenu"
import { useMediaQuery } from "./useMediaQuery"
import { ViewSwitcher } from "./ViewSwitcher"
import "../styles/toolbar.css"

/** Below this width the Today label, the week/event badge and the New event label all hide behind icons — matches toolbar.css. */
const NARROW_QUERY = "(max-width: 640px)"

/** Props for {@link Toolbar}. */
export interface ToolbarProps<TData = unknown> {
  instance: CalendarInstance<TData>
  labels: CalendarLabels
  /** Whether the sidebar is currently shown, reflected as the toggle button's pressed state. */
  sidebarOpen: boolean
  onToggleSidebar: () => void
  /** Omit to hide the "+ New event" button even when `instance.flags.create` is true. */
  onNewEvent?: () => void
}

/**
 * The calendar's top bar: sidebar toggle, settings, navigation, the current
 * period's title, and the view switcher.
 *
 * Reads and writes `instance` directly rather than taking individual
 * callbacks for each action — the only state the toolbar owns itself is the
 * settings menu's open/closed flag, so a custom shell can reproduce this bar
 * exactly by wiring the same instance in.
 */
export function Toolbar<TData = unknown>({ instance, labels, sidebarOpen, onToggleSidebar, onNewEvent }: ToolbarProps<TData>) {
  const { locale } = instance.settings
  const title = formatTitle(instance.view, instance.date, locale)
  const badge = toolbarBadge(instance, labels)
  const slotClass = useSlotClass("toolbar")
  // Drives icon-only mode below 640px: the accessible name (aria-label) stays
  // put at every width, only the visible label text comes and goes, so this
  // needs to be a real conditional render rather than a CSS-hidden span —
  // "no visible text" has to be verifiable from the DOM, not a stylesheet.
  const isNarrow = useMediaQuery(NARROW_QUERY)

  return (
    <div className={classNames("cal-toolbar", slotClass)}>
      <div className="cal-toolbar-group">
        <button
          type="button"
          className="cal-icon-btn"
          aria-label={labels.toggleSidebar}
          aria-pressed={sidebarOpen}
          onClick={onToggleSidebar}
        >
          <HamburgerIcon />
        </button>
        <ToolbarSettingsMenu instance={instance} labels={labels} />
        <button type="button" className="cal-btn cal-btn-outline cal-toolbar-today" aria-label={labels.today} onClick={instance.goToday}>
          <CalendarIcon />
          {isNarrow ? null : labels.today}
        </button>
        <button type="button" className="cal-icon-btn cal-btn-outline" aria-label={labels.previous} onClick={instance.goPrevious}>
          ‹
        </button>
        <button type="button" className="cal-icon-btn cal-btn-outline" aria-label={labels.next} onClick={instance.goNext}>
          ›
        </button>
        <h2 className="cal-toolbar-title" aria-live="polite">
          {title}
        </h2>
        {badge !== null && !isNarrow ? <span className="cal-toolbar-badge">{badge}</span> : null}
      </div>
      <div className="cal-toolbar-group">
        {instance.flags.create && onNewEvent ? (
          <button type="button" className="cal-btn cal-btn-primary cal-toolbar-newevent" aria-label={labels.newEvent} onClick={onNewEvent}>
            {isNarrow ? <PlusIcon /> : labels.newEvent}
          </button>
        ) : null}
        <ViewSwitcher view={instance.view} labels={labels} onChange={instance.setView} />
      </div>
    </div>
  )
}

/**
 * The small pill next to the title: the ISO week number in week view, the
 * event count in agenda view, and nothing for the other three views.
 */
function toolbarBadge<TData>(instance: CalendarInstance<TData>, labels: CalendarLabels): string | null {
  if (instance.view === "week") return fill(labels.weekNumber, { n: isoWeek(instance.date) })
  if (instance.view === "agenda") return fill(labels.eventCount, { n: instance.events.length })
  return null
}

/** The sidebar toggle's hamburger glyph. */
function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** The "Today" button's small calendar glyph. */
function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 6.5h12M5 1.5v3M11 1.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

/** The "New event" button's glyph, shown alone once the label hides at the icon-only breakpoint. */
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
