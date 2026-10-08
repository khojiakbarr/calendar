# Changelog

## 0.2.6 — 2026-10-08

- `onCreateRequest(draft, anchor)` on `Calendar`: a drag or double-click on empty space, or New event (`anchor`
  null), hands the draft to the host instead of opening the editor — the host makes the record its own way. The
  gestures and New event are offered even when the source cannot `create`.
- The sidebar's resource groups fold like an accordion: the group's name and chevron open and fold it, its checkbox
  still shows or hides the whole group, and a folded group's entries are `inert`. `collapsedGroups` and
  `onCollapsedGroupsChange` let a host keep the folding between visits; new labels `expandGroup` and `collapseGroup`.
- A lifted month or all-day chip grows toward the side of its row with room — leftwards near the right edge — and
  never past the row (`data-lift`, `--cal-lift-room`). It used to grow past Sunday's edge and make the page scroll
  sideways. An all-day chip's lift keeps its side margins, so it no longer pokes 2px over the edge.
- The mini calendar's header fits: «октябрь 2026», not a wrapped «октябрь 2026 г.» (`formatMonthYear`), and its
  « ‹ › » steps — and the toolbar's ‹ › — are drawn chevrons, centred in their buttons.

## 0.2.5 — 2026-10-08

- An event's tooltip no longer covers the event. It is measured at its own width wherever it stands
  (`width: max-content`) — laid out first at the viewport's right edge it was measured squeezed, placed to
  the left by that width, then widened over its chip — and it is placed beside the chip as it is when the
  tooltip appears, grown to its lifted size, not as it was when the pointer arrived. `useHoverIntent`'s
  `show` also takes a function, read when the delay is over.
- A lifted event's shadow is deeper (`--cal-hover-shadow`), and deeper again in dark mode, where the light
  one barely showed.

## 0.2.4 — 2026-10-08

- The sidebar's checkboxes are the calendar's own, not the browser's: its ground and edge in dark mode
  too, filled with the row's colour under a tick when checked, a dash when mixed.
- The loading line stays inside the calendar: a short bar running along a clipped track, instead of a
  full-width bar sliding four widths past the edge.

## 0.2.3 — 2026-10-08

- The time grid's head row is `--cal-day-header-height` tall (72px by default, at most 60px on a narrow
  screen), so a head set to one line can be short too.

## 0.2.2 — 2026-10-08

- Today in the year view is a circle again — 28px, centred — instead of an oval as wide as its column.
- A day's head on the time grid is set by tokens: `--cal-day-header-direction` (`column`, or `row` to put the
  weekday beside its number), `--cal-day-header-gap`, `--cal-day-header-padding`, `--cal-day-number-size`,
  `--cal-day-number-box` and `--cal-day-number-offset` — a host that wants a shorter head no longer
  overrides selectors.

## 0.2.1 — 2026-10-08

- A crowded hour stays readable: a cluster of overlapping timed events takes at most `maxEventColumns`
  columns (default 3 in a week, twice that in the day view), and the rest gather into one «+N» slot
  (`.cal-timegrid-more`) that opens the day view from a week, or the agenda from a day. `limitColumns`
  is exported beside `layoutDay`.
- The agenda opens on today when the month shown holds it, rather than on the 1st.
- `agendaSpans: "first"` lists a multi-day event once, under the first shown day it touches, instead of
  under every day (`"each"`, the default) — a three-month plan is one row, not ninety.
- On a phone an agenda row's text wraps instead of being cut after its date range, and a `marker` sits on
  the row's label rather than on a line of its own.
- A click on a timed event reaches it in Chrome: the time grid took the pointer on the press, so the
  release — and the click — landed on the grid; it now takes it only once a press travels far enough to
  be a drag. The «+N» slot reads «+4» in a narrow column, and `sidebar={false}` draws no sidebar toggle.
- An event under the pointer (or focused) is lifted: a shadow, the column's full width and its whole text —
  wrapped, not cut — eased in, with no ring (`hover.css`, `--cal-hover-shadow`). A time-grid chip's left,
  width and height now come from `--cal-chip-left`, `--cal-chip-width`, `--cal-chip-height`, so the hover can
  grow it; a record's other dates glow in their colour instead of wearing an outline.
- `--cal-date-scale` (default 1) sizes the date numerals: the day numbers, the day headers, the agenda's, the
  mini-calendar's and the year's.
- The docs and a live preview are on GitHub Pages: https://khojiakbarr.github.io/calendar/
- Latin Uzbek gets CLDR's month and weekday names where the browser's `Intl` has none (Chrome gives
  "M10"): «Oktabr 2026», «8-okt», «payshanba».

## 0.2.0 — 2026-10-08

First release on npm, as `@hojiakbar_dev/calendar` (0.1.0 was never published).

- `now` — the host's clock decides today, the now-line, «Today» and the day the calendar opens on.
- Event looks in a Gantt's words: `appearance` (`plan` dashed, `actual` filled, `overrun` striped red),
  `marker` (`tick`, `dot`), `tone` (`primary`, `success`, `danger`, `neutral`; new tokens `--cal-success`,
  `--cal-neutral`), and a host's own `className`.
- `groupId` — the other dates of a record light up while one of them is pointed at.
- `onEventClick` on `<Calendar>` — the host opens its own record; the editor stays shut.
- Grouped resources: `group` on a resource, a checkbox per group, `instance.setResourcesHidden`.
- Month and agenda chips carry `data-event-id`, as the time grid's always did.
- A double-click on a month or agenda chip opens it once, as the time grid's always did (it opened it two or three times).
