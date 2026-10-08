import { useCallback, useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent } from "react"
import { classNames } from "../core/classNames"
import { CalendarClassesContext, type CalendarClasses } from "./classesContext"
import { CalendarThemeContext } from "./themeContext"
import type { CalendarInstance } from "../instance"
import type { CalendarEvent, CalendarLabels, CalendarView, EventDraft } from "../types"
import type { DialogPresentation } from "./Dialog"
import { EventEditor } from "./EventEditor"
import { EventTooltip } from "./EventTooltip"
import { LitGroupContext } from "./litGroupContext"
import { defaultLabels } from "./labels"
import type { AnchorRect } from "./Popover"
import { Sidebar } from "./Sidebar"
import { Toolbar } from "./Toolbar"
import { buildNewEventDraft, useEditorState } from "./useEditorState"
import { useHoverIntent, type HoverTarget } from "./useHoverIntent"
import { useMediaQuery } from "./useMediaQuery"
import { AgendaView } from "./views/AgendaView"
import { rectOf } from "./views/anchor"
import { DayView } from "./views/DayView"
import { MonthView } from "./views/MonthView"
import { WeekView } from "./views/WeekView"
import { YearView } from "./views/YearView"
import "../styles/calendar.css"

/** Below this width the sidebar becomes a drawer; keep in sync with sidebar.css. */
const NARROW_SCREEN_QUERY = "(max-width: 900px)"

/** How long the pointer must linger on an event before its tooltip appears. */
const HOVER_DELAY_MS = 400

/** Form elements a keyboard shortcut must leave alone. */
const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"])

/** Props for {@link Calendar}. */
export interface CalendarProps<TData = unknown> {
  /** The calendar to render; drive it with `useCalendar` or a hand-written equivalent. */
  instance: CalendarInstance<TData>
  /** Overrides for individual {@link CalendarLabels} keys; the rest fall back to `defaultLabels`. */
  labels?: Partial<CalendarLabels>
  /** Forces light or dark chrome; omit to follow the OS. */
  theme?: "light" | "dark"
  className?: string
  /** Whether the mini-calendar/filter/resource rail can be shown at all. Default true. */
  sidebar?: boolean
  /** CSS height of the root element; omit to fill the parent (min 480px). */
  height?: number | string
  /**
   * Extra classes appended alongside individual slots' own `cal-*` class —
   * for the rare case a token override or an unlayered CSS rule cannot
   * reach: a CSS Module class, or a Tailwind utility that must apply
   * directly rather than cascade in. Never replaces the slot's class.
   *
   * See the "Styling" section of the README for the full slot list.
   */
  classes?: CalendarClasses
  /**
   * How the event editor presents itself: `"modal"`, `"sheet"`, or `"auto"`
   * (default) — a sheet on a narrow viewport, a modal otherwise. Passed
   * straight through to `EventEditor`'s `presentation` prop.
   */
  editorPresentation?: DialogPresentation
  /**
   * A click (or Enter) on an event. Given, the calendar's own editor never
   * opens for an event: the host opens the record its own way — its page,
   * its own dialog. Creating by drag is unaffected.
   */
  onEventClick?: (event: CalendarEvent<TData>, anchor: HTMLElement) => void
}

/** Whether `target` is a form control a global keyboard shortcut must not fire inside of. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return EDITABLE_TAGS.has(target.tagName) || target.isContentEditable
}

/**
 * The batteries-included calendar shell: toolbar, sidebar, the view for
 * `instance.view`, and the popovers (editor, tooltip) that float above them.
 *
 * A thin wrapper by design — everything it renders is also exported on its
 * own, so an application that needs a different arrangement can drop this
 * component and recompose {@link Toolbar}, {@link Sidebar} and the views
 * around the same `instance`.
 *
 * @example
 * const instance = useCalendar({ id: "clinic", source, resources })
 * return <Calendar instance={instance} />
 */
export function Calendar<TData = unknown>({
  instance,
  labels: labelOverrides,
  theme,
  className,
  sidebar = true,
  height,
  classes = {},
  editorPresentation = "auto",
  onEventClick,
}: CalendarProps<TData>) {
  const labels = useMemo(() => ({ ...defaultLabels, ...labelOverrides }), [labelOverrides])
  // On a narrow screen the sidebar is an overlay drawer, so it starts closed
  // there and follows the breakpoint when the window is resized across it.
  const isNarrow = useMediaQuery(NARROW_SCREEN_QUERY)
  const [sidebarOpen, setSidebarOpen] = useState(() => !isNarrow)
  useEffect(() => setSidebarOpen(!isNarrow), [isNarrow])
  // The record under the pointer: its other dates are drawn lit (`groupId`).
  const [litGroup, setLitGroup] = useState<string | null>(null)
  const handleCloseSidebar = useCallback(() => setSidebarOpen(false), [])
  const editorState = useEditorState(instance)
  const hover = useHoverIntent<CalendarEvent<TData>>(HOVER_DELAY_MS)
  // Read directly off the prop rather than through CalendarClassesContext:
  // the provider below is for descendants, and providing to yourself would
  // only ever resolve to whatever ancestor Calendar (if any) wraps this one.
  const rootSlotClass = classes.root

  const handleToggleSidebar = useCallback(() => setSidebarOpen((open) => !open), [])

  // The editor opens unanchored, so only a host's `onEventClick` uses the
  // chip element; `handleCreateRequest` below takes fewer parameters than its
  // view-level type (the AnchorRect is for the drag-ghost machinery).
  const handleEventOpen = useCallback(
    (event: CalendarEvent<TData>, anchor: HTMLElement) => {
      hover.hide()
      if (onEventClick) {
        onEventClick(event, anchor)
        return
      }
      editorState.openEdit(event)
    },
    [editorState, hover, onEventClick],
  )

  const handleCreateRequest = useCallback(
    (draft: EventDraft<TData>) => {
      hover.hide()
      editorState.openCreate(draft)
    },
    [editorState, hover],
  )

  const handleEventHover = useCallback(
    (event: CalendarEvent<TData> | null, el: HTMLElement | null) => {
      setLitGroup(event?.groupId ?? null)
      if (event && el) hover.show({ event, anchor: rectOf(el) })
      else hover.hide()
    },
    [hover],
  )

  const handleNewEvent = useCallback(() => {
    hover.hide()
    editorState.openCreate(buildNewEventDraft(instance))
  }, [editorState, hover, instance])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isEditableTarget(event.target)) return
    if (event.key === "ArrowLeft") instance.goPrevious()
    else if (event.key === "ArrowRight") instance.goNext()
    else if (event.key.toLowerCase() === "t") instance.goToday()
  }

  const rootStyle: CSSProperties = height === undefined ? {} : { height }

  return (
    <CalendarThemeContext.Provider value={theme}>
    <CalendarClassesContext.Provider value={classes}>
    <LitGroupContext.Provider value={litGroup}>
    <div className={classNames("cal-root", rootSlotClass, className)} data-theme={theme} style={rootStyle} onKeyDown={handleKeyDown}>
      <Toolbar
        instance={instance}
        labels={labels}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        {...(instance.flags.create ? { onNewEvent: handleNewEvent } : {})}
      />

      {instance.status === "loading" ? <div className="cal-progress" aria-hidden="true" /> : null}
      {instance.status === "error" ? (
        <div className="cal-error" role="alert">
          <span className="cal-error-message">{labels.loadFailed}</span>
          <button type="button" className="cal-btn" onClick={instance.reload}>
            {labels.retry}
          </button>
        </div>
      ) : null}

      <div className="cal-body">
        {sidebar && sidebarOpen ? (
          <Sidebar instance={instance} labels={labels} onClose={handleCloseSidebar} />
        ) : null}
        <div className="cal-main">
          {renderView(instance.view, {
            instance,
            labels,
            onEventOpen: handleEventOpen,
            onCreateRequest: handleCreateRequest,
            onEventHover: handleEventHover,
          })}
        </div>
      </div>

      {/* Only one floating card at a time: a tooltip behind the editor would be confusing and is redundant with it. */}
      {hover.target && !editorState.editor ? (
        <HoverTooltip target={hover.target} instance={instance} labels={labels} />
      ) : null}

      {editorState.editor ? (
        <EventEditor
          mode={editorState.editor.mode}
          initial={editorState.editor.initial}
          resources={instance.resources}
          labels={labels}
          locale={instance.settings.locale}
          presentation={editorPresentation}
          canRemove={editorState.canRemove}
          isPending={editorState.isPending}
          onSave={editorState.save}
          onRemove={editorState.remove}
          onCancel={editorState.cancel}
        />
      ) : null}
    </div>
    </LitGroupContext.Provider>
    </CalendarClassesContext.Provider>
    </CalendarThemeContext.Provider>
  )
}

/** Props shared by every view that takes editor/tooltip callbacks (all but year). */
interface ViewSwitchProps<TData> {
  instance: CalendarInstance<TData>
  labels: CalendarLabels
  onEventOpen: (event: CalendarEvent<TData>, el: HTMLElement) => void
  onCreateRequest: (draft: EventDraft<TData>, anchor: AnchorRect) => void
  onEventHover: (event: CalendarEvent<TData> | null, el: HTMLElement | null) => void
}

/** Picks the view component for `instance.view` — the one place that has to know all five exist. */
function renderView<TData>(view: CalendarView, props: ViewSwitchProps<TData>) {
  switch (view) {
    case "day":
      return <DayView {...props} />
    case "week":
      return <WeekView {...props} />
    case "month":
      return <MonthView {...props} />
    case "year":
      return <YearView instance={props.instance} labels={props.labels} />
    case "agenda":
      return <AgendaView instance={props.instance} labels={props.labels} onEventOpen={props.onEventOpen} />
    default: {
      const exhaustive: never = view
      throw new Error(`Unknown view: ${String(exhaustive)}`)
    }
  }
}

/**
 * The hovered event's read-only card, resolving its resource name here
 * (rather than inline) so the `exactOptionalPropertyTypes` spread needed to
 * omit an unknown resource lives in one place.
 */
function HoverTooltip<TData>({
  target,
  instance,
  labels,
}: {
  target: HoverTarget<CalendarEvent<TData>>
  instance: CalendarInstance<TData>
  labels: CalendarLabels
}) {
  const resourceName = instance.resourceOf(target.event)?.name
  return (
    <EventTooltip
      event={target.event}
      anchor={target.anchor}
      color={instance.colorOf(target.event)}
      locale={instance.settings.locale}
      labels={labels}
      {...(resourceName === undefined ? {} : { resourceName })}
    />
  )
}
