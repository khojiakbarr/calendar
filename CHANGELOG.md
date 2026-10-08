# Changelog

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
