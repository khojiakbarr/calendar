import { useId, useMemo, type FormEvent } from "react"
import { classNames } from "../core/classNames"
import { formatFullDate, parseDateTimeInputs } from "../core/format"
import type { CalendarLabels, CalendarResource, EventDraft } from "../types"
import { useSlotClass } from "./classesContext"
import { Popover, type AnchorRect } from "./Popover"
import { useEditorForm } from "./useEditorForm"
import "../styles/editor.css"

/** Matches the "Bryntum editor" card width from the look spec. */
const EDITOR_WIDTH_PX = 360

export interface EventEditorProps<T> {
  mode: "create" | "edit"
  initial: EventDraft<T>
  resources: CalendarResource[]
  labels: CalendarLabels
  locale: string
  anchor: AnchorRect | null
  /** Whether Delete is offered at all (edit mode still needs `flags.remove` too). */
  canRemove: boolean
  /** Disables Save and swaps its label to `labels.saving` while a mutation is in flight. */
  isPending: boolean
  onSave: (draft: EventDraft<T>) => void
  onRemove: () => void
  onCancel: () => void
}

/**
 * The create/edit form for one event, rendered inside a {@link Popover}.
 *
 * Field state and validation live in `useEditorForm`; this component is
 * markup and wiring only. Fields: name, resource (with a colour swatch),
 * an all-day switch that hides the time inputs, and start/end date+time.
 *
 * @example
 * <EventEditor mode="create" initial={draft} resources={resources} labels={labels}
 *   locale="en-US" anchor={slotAnchor} canRemove={false} isPending={false}
 *   onSave={createEvent} onRemove={() => {}} onCancel={closeEditor} />
 */
export function EventEditor<T>({
  mode,
  initial,
  resources,
  labels,
  locale,
  anchor,
  canRemove,
  isPending,
  onSave,
  onRemove,
  onCancel,
}: EventEditorProps<T>) {
  const titleId = useId()
  const form = useEditorForm(initial, labels)
  const slotClass = useSlotClass("editor")
  // A readable preview of the Start date, for locale-aware context above a
  // plain <input type="date"> — the only use this component has for `locale`.
  const startPreview = useMemo(
    () => parseDateTimeInputs(form.state.startDate, form.state.startTime),
    [form.state.startDate, form.state.startTime],
  )

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const draft = form.buildDraft()
    if (draft) onSave(draft)
  }

  return (
    <Popover anchor={anchor} onClose={onCancel} labelledBy={titleId} width={EDITOR_WIDTH_PX}>
      <form className={classNames("cal-editor", slotClass)} onSubmit={handleSubmit}>
        <div className="cal-editor-header">
          <h3 id={titleId} className="cal-editor-title">
            {mode === "edit" ? labels.editorEditTitle : labels.editorNewTitle}
          </h3>
          <button type="button" className="cal-icon-btn" aria-label={labels.close} onClick={onCancel}>
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {startPreview ? <p className="cal-editor-preview">{formatFullDate(startPreview, locale)}</p> : null}

        <label className="cal-editor-field">
          <span className="cal-editor-label">{labels.name}</span>
          <input className="cal-input" autoFocus value={form.state.name} onChange={(event) => form.setName(event.target.value)} />
        </label>

        <ResourceField
          labels={labels}
          resources={resources}
          resourceId={form.state.resourceId}
          onChange={form.setResourceId}
        />

        <label className="cal-editor-field cal-editor-switch">
          <span className="cal-editor-label">{labels.allDay}</span>
          <span className="cal-switch">
            <input
              type="checkbox"
              role="switch"
              className="cal-switch-input"
              checked={form.state.allDay}
              onChange={(event) => form.setAllDay(event.target.checked)}
            />
            <span className="cal-switch-track" aria-hidden="true">
              <span className="cal-switch-knob" />
            </span>
          </span>
        </label>

        <DateTimeField
          label={labels.start}
          dateValue={form.state.startDate}
          timeValue={form.state.startTime}
          allDay={form.state.allDay}
          onDateChange={form.setStartDate}
          onTimeChange={form.setStartTime}
        />
        <DateTimeField
          label={labels.end}
          dateValue={form.state.endDate}
          timeValue={form.state.endTime}
          allDay={form.state.allDay}
          onDateChange={form.setEndDate}
          onTimeChange={form.setEndTime}
        />
        {form.error ? (
          <p className="cal-editor-error" role="alert">
            {form.error}
          </p>
        ) : null}

        <div className="cal-editor-actions">
          {mode === "edit" && canRemove ? (
            <button type="button" className="cal-btn cal-btn-danger cal-editor-delete" onClick={onRemove}>
              {labels.delete}
            </button>
          ) : null}
          <button type="button" className="cal-btn" onClick={onCancel}>
            {labels.cancel}
          </button>
          <button type="submit" className="cal-btn cal-btn-primary" disabled={isPending}>
            {isPending ? labels.saving : labels.save}
          </button>
        </div>
      </form>
    </Popover>
  )
}

interface ResourceFieldProps {
  labels: CalendarLabels
  resources: CalendarResource[]
  resourceId: string | undefined
  onChange: (resourceId: string) => void
}

/** The resource `<select>`, with a swatch showing the selected resource's colour. */
function ResourceField({ labels, resources, resourceId, onChange }: ResourceFieldProps) {
  const selected = resources.find((resource) => resource.id === resourceId)
  return (
    <label className="cal-editor-field">
      <span className="cal-editor-label">{labels.resource}</span>
      <span className="cal-editor-resource-row">
        <span className="cal-editor-swatch" style={{ backgroundColor: selected?.color ?? "transparent" }} aria-hidden="true" />
        <select className="cal-input" value={resourceId ?? ""} onChange={(event) => onChange(event.target.value)}>
          <option value="">{labels.noResource}</option>
          {resources.map((resource) => (
            <option key={resource.id} value={resource.id}>
              {resource.name}
            </option>
          ))}
        </select>
      </span>
    </label>
  )
}

interface DateTimeFieldProps {
  label: string
  dateValue: string
  timeValue: string
  allDay: boolean
  onDateChange: (value: string) => void
  onTimeChange: (value: string) => void
}

/** A date input plus, unless `allDay` is set, a time input beside it. */
function DateTimeField({ label, dateValue, timeValue, allDay, onDateChange, onTimeChange }: DateTimeFieldProps) {
  return (
    <div className="cal-editor-field">
      <span className="cal-editor-label">{label}</span>
      <div className="cal-editor-datetime">
        <input type="date" className="cal-input" aria-label={label} value={dateValue} onChange={(event) => onDateChange(event.target.value)} />
        {allDay ? null : (
          <input type="time" className="cal-input" aria-label={label} value={timeValue} onChange={(event) => onTimeChange(event.target.value)} />
        )}
      </div>
    </div>
  )
}
