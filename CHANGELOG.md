# Changelog

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
