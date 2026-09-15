import type { CalendarLabels, CalendarView } from "../types"

/** Every view the switcher offers, in display order. */
const VIEWS: readonly CalendarView[] = ["day", "week", "month", "year", "agenda"]

interface ViewSwitcherProps {
  view: CalendarView
  labels: CalendarLabels
  onChange: (view: CalendarView) => void
}

/**
 * The Day / Week / Month / Year / Agenda segmented control in the toolbar.
 *
 * `labels[candidate]` works directly because `CalendarView`'s five values
 * are, by design, also keys of `CalendarLabels` — one source of truth for
 * the view names instead of a separate lookup table.
 */
export function ViewSwitcher({ view, labels, onChange }: ViewSwitcherProps) {
  return (
    <div className="cal-segmented">
      {VIEWS.map((candidate) => (
        <button key={candidate} type="button" aria-pressed={view === candidate} onClick={() => onChange(candidate)}>
          {labels[candidate]}
        </button>
      ))}
    </div>
  )
}
