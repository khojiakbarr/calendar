import { useCallback, useState } from "react"
import { addMinutes, isSameDay, minutesOfDay, withMinutesOfDay } from "../core/date"
import type { CalendarInstance } from "../instance"
import type { CalendarEvent, EventDraft } from "../types"
import type { AnchorRect } from "./Popover"
import { rectOf } from "./views/anchor"

/** Minutes in a full day — caps a ceiling-snapped start at the following midnight. */
const MINUTES_PER_DAY = 24 * 60

/** Fallback start hour for a new event when `instance.date` is not today. */
const DEFAULT_START_HOUR = 9

/** The editor popover's state: closed (`null`), or open for a create or an edit. */
export interface EditorState<T> {
  mode: "create" | "edit"
  initial: EventDraft<T>
  /** Set only in edit mode — the event being changed. */
  eventId?: string
  anchor: AnchorRect | null
}

/** What {@link useEditorState} exposes to the shell. */
export interface EditorController<T> {
  editor: EditorState<T> | null
  /** Opens the editor for an existing event, unless editing is off or the event forbids it. */
  openEdit(event: CalendarEvent<T>, el: HTMLElement): void
  /** Opens the editor for a new event, unless creating is off. */
  openCreate(draft: EventDraft<T>, anchor: AnchorRect | null): void
  /** Saves the open editor's draft (create or update, depending on `editor.mode`) and closes it. */
  save(draft: EventDraft<T>): void
  /** Removes the event being edited and closes the editor. */
  remove(): void
  /** Closes the editor without saving. */
  cancel(): void
  /** Whether the open editor may offer Delete. */
  canRemove: boolean
  /** Whether the event being edited has a mutation in flight. */
  isPending: boolean
}

/**
 * Owns the create/edit popover's open/closed state and turns the shell's
 * gestures into `instance` mutations.
 *
 * Every mutation is already optimistic (see `useCalendar`), so `save` and
 * `remove` close the popover the instant they are called rather than
 * waiting on the returned promise — the event on screen updates
 * immediately and rolls back on its own if the server rejects it.
 *
 * `save`/`remove` read `editor` from the closure rather than a state
 * updater function, deliberately: React 18 Strict Mode double-invokes
 * updater callbacks, and this one calls `instance.createEvent` — a real
 * network request that must fire exactly once.
 *
 * @param instance - The calendar whose events this editor changes.
 */
export function useEditorState<T>(instance: CalendarInstance<T>): EditorController<T> {
  const [editor, setEditor] = useState<EditorState<T> | null>(null)

  const openEdit = useCallback(
    (event: CalendarEvent<T>, el: HTMLElement) => {
      if (!instance.flags.edit || event.readOnly === true) return
      const { id, ...initial } = event
      setEditor({ mode: "edit", initial, eventId: id, anchor: rectOf(el) })
    },
    [instance.flags.edit],
  )

  const openCreate = useCallback(
    (draft: EventDraft<T>, anchor: AnchorRect | null) => {
      if (!instance.flags.create) return
      setEditor({ mode: "create", initial: draft, anchor })
    },
    [instance.flags.create],
  )

  const cancel = useCallback(() => setEditor(null), [])

  const save = useCallback(
    (draft: EventDraft<T>) => {
      if (!editor) return
      if (editor.mode === "create") void instance.createEvent(draft)
      else if (editor.eventId !== undefined) void instance.updateEvent(editor.eventId, draft)
      setEditor(null)
    },
    [editor, instance],
  )

  const remove = useCallback(() => {
    if (editor?.eventId !== undefined) void instance.removeEvent(editor.eventId)
    setEditor(null)
  }, [editor, instance])

  return {
    editor,
    openEdit,
    openCreate,
    save,
    remove,
    cancel,
    canRemove: instance.flags.remove,
    isPending: editor?.eventId !== undefined ? instance.pendingIds.has(editor.eventId) : false,
  }
}

/**
 * The draft for a brand-new event started from the toolbar's "New event"
 * button, rather than from a drag or a double-click on a grid slot.
 *
 * Starts at the next `snapMinutes` boundary from the current time when
 * `instance.date` is today, so the button lands the event somewhere useful
 * right now; otherwise at 09:00, since a click on a date that isn't today
 * carries no "now" to round.
 *
 * @param instance - Supplies the anchor date, snap/duration settings, and
 *   which resource is currently visible (the default for the new event).
 */
export function buildNewEventDraft<T>(instance: CalendarInstance<T>): EventDraft<T> {
  const { snapMinutes, defaultEventMinutes } = instance.settings
  const now = new Date()
  const startMinutes = isSameDay(instance.date, now)
    ? Math.min(MINUTES_PER_DAY, Math.ceil(minutesOfDay(now) / snapMinutes) * snapMinutes)
    : DEFAULT_START_HOUR * 60

  const start = withMinutesOfDay(instance.date, startMinutes)
  const end = addMinutes(start, defaultEventMinutes)
  const resourceId = instance.resources.find((resource) => !instance.hiddenResourceIds.includes(resource.id))?.id

  return {
    name: "",
    start,
    end,
    allDay: false,
    ...(resourceId === undefined ? {} : { resourceId }),
  }
}
