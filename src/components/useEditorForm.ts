import { useState } from "react"
import { addDays, startOfDay } from "../core/date"
import { formatDateInput, formatTimeInput, parseDateTimeInputs } from "../core/format"
import type { CalendarLabels, EventDraft } from "../types"

/** Controlled values behind the editor's inputs — always strings, parsed only on save. */
interface EditorFormState {
  name: string
  resourceId: string | undefined
  allDay: boolean
  startDate: string
  startTime: string
  endDate: string
  endTime: string
}

/** What {@link useEditorForm} exposes to `EventEditor`'s markup. */
export interface EditorForm<T> {
  state: EditorFormState
  /** {@link CalendarLabels.endBeforeStart} once a save attempt fails validation; else `null`. */
  error: string | null
  setName(name: string): void
  setResourceId(resourceId: string): void
  setAllDay(allDay: boolean): void
  setStartDate(value: string): void
  setStartTime(value: string): void
  setEndDate(value: string): void
  setEndTime(value: string): void
  /** Validates the current fields and returns the draft to save, or `null` (with {@link error} set) when invalid. */
  buildDraft(): EventDraft<T> | null
}

/**
 * Controlled state and validation for `EventEditor`, split out so that
 * component file stays markup-only.
 *
 * All-day events show the *inclusive* last day in the End date input — what
 * a person expects to type and read — while the domain model's `end` stays
 * exclusive (see types.ts). This hook is the one place that converts
 * between the two, both seeding the form from `initial` and building the
 * draft to save.
 *
 * @param initial - The event to prefill from. A new object identity (a
 *   different event was picked, or the editor reopened) re-seeds the form.
 * @param labels - Supplies the untitled-name fallback and the validation message.
 */
export function useEditorForm<T>(initial: EventDraft<T>, labels: CalendarLabels): EditorForm<T> {
  const [seed, setSeed] = useState(initial)
  const [state, setState] = useState<EditorFormState>(() => toFormState(initial))
  const [error, setError] = useState<string | null>(null)

  // Adjust state during render rather than in an effect: `initial` changing
  // identity should replace the form before the next paint, not one render
  // later. (See React's "adjusting state when a prop changes" pattern.)
  if (initial !== seed) {
    setSeed(initial)
    setState(toFormState(initial))
    setError(null)
  }

  function buildDraft(): EventDraft<T> | null {
    const name = state.name.trim() || labels.untitled
    const range = state.allDay ? parseAllDayRange(state) : parseTimedRange(state)
    if (!range) {
      setError(labels.endBeforeStart)
      return null
    }
    setError(null)
    const merged = { ...initial, name, allDay: state.allDay, start: range.start, end: range.end }
    return applyResourceId(merged, state.resourceId)
  }

  return {
    state,
    error,
    setName: (name) => setState((s) => ({ ...s, name })),
    setResourceId: (resourceId) => setState((s) => ({ ...s, resourceId: resourceId || undefined })),
    setAllDay: (allDay) => setState((s) => ({ ...s, allDay })),
    setStartDate: (startDate) => setState((s) => ({ ...s, startDate })),
    setStartTime: (startTime) => setState((s) => ({ ...s, startTime })),
    setEndDate: (endDate) => setState((s) => ({ ...s, endDate })),
    setEndTime: (endTime) => setState((s) => ({ ...s, endTime })),
    buildDraft,
  }
}

function toFormState<T>(draft: EventDraft<T>): EditorFormState {
  const allDay = draft.allDay === true
  const inclusiveEnd = allDay ? addDays(draft.end, -1) : draft.end
  return {
    name: draft.name,
    resourceId: draft.resourceId,
    allDay,
    startDate: formatDateInput(draft.start),
    startTime: formatTimeInput(draft.start),
    endDate: formatDateInput(inclusiveEnd),
    endTime: formatTimeInput(draft.end),
  }
}

/** Start/end for a timed event, or `null` when either input is malformed or end does not follow start. */
function parseTimedRange(state: EditorFormState): { start: Date; end: Date } | null {
  const start = parseDateTimeInputs(state.startDate, state.startTime)
  const end = parseDateTimeInputs(state.endDate, state.endTime)
  if (!start || !end || end.getTime() <= start.getTime()) return null
  return { start, end }
}

/** Start/end for an all-day event: the inclusive End date input converted back to an exclusive next-midnight. */
function parseAllDayRange(state: EditorFormState): { start: Date; end: Date } | null {
  const start = parseDateTimeInputs(state.startDate, "00:00")
  const inclusiveEnd = parseDateTimeInputs(state.endDate, "00:00")
  if (!start || !inclusiveEnd) return null
  const startDay = startOfDay(start)
  const end = addDays(startOfDay(inclusiveEnd), 1)
  if (end.getTime() <= startDay.getTime()) return null
  return { start: startDay, end }
}

/**
 * Sets `resourceId`, or removes it when cleared.
 *
 * WHY: `exactOptionalPropertyTypes` forbids assigning an explicit
 * `undefined` to an optional field — clearing the resource select must omit
 * the key entirely, not null it out.
 */
function applyResourceId<T>(draft: EventDraft<T>, resourceId: string | undefined): EventDraft<T> {
  if (resourceId !== undefined) return { ...draft, resourceId }
  const { resourceId: _cleared, ...withoutResourceId } = draft
  return withoutResourceId
}
