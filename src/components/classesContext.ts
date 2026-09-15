import { createContext, useContext } from "react"

/**
 * Every element the `classes` prop can add a class to.
 *
 * One entry per visually distinct part of the shell — the root, the chrome
 * around the views (toolbar, sidebar and its two sections), each view's own
 * root, the two grid sub-parts that are shared across views (`dayHeader`,
 * `allDayRow`, `timeGrid`), every event chip regardless of which view drew
 * it, and the four floating cards (`popover`, `dialog`, `editor`, `tooltip`).
 * Kept in sync with the `classes` table in
 * README.md's "Styling" section — that table is the contract, this type is
 * its enforcement.
 */
export type CalendarSlot =
  | "root"
  | "toolbar"
  | "sidebar"
  | "miniCalendar"
  | "resourceFilter"
  | "view"
  | "dayHeader"
  | "allDayRow"
  | "timeGrid"
  | "event"
  | "month"
  | "monthCell"
  | "year"
  | "agenda"
  | "popover"
  | "dialog"
  | "editor"
  | "tooltip"

/**
 * Consumer-supplied classes, one per {@link CalendarSlot}, all optional.
 *
 * Each one is *appended* to the slot's own `cal-*` class rather than
 * replacing it — see the `classes` prop on `Calendar` and the `classNames()`
 * helper every slot renders through.
 */
export type CalendarClasses = Partial<Record<CalendarSlot, string>>

/**
 * The `classes` map the nearest `<Calendar>` was given, read by every slot
 * via {@link useSlotClass}.
 *
 * A context rather than prop drilling because the tree between `Calendar`
 * and a deeply nested slot (an event chip three views down, the editor
 * inside a portaled popover) has no reason to know about styling at all —
 * the same reasoning `CalendarThemeContext` already uses for theme. Default
 * is `{}` so a slot rendered with no `<Calendar>` ancestor (a headless
 * layout composed directly from the exported pieces) still resolves every
 * slot to `undefined` instead of throwing.
 */
export const CalendarClassesContext = createContext<CalendarClasses>({})

/**
 * The extra class configured for one slot, or `undefined` if the consumer
 * did not set one.
 *
 * @param slot - Which part of the shell is asking.
 * @returns The class to append alongside the slot's `cal-*` class.
 *
 * @example
 * <div className={classNames("cal-toolbar", useSlotClass("toolbar"))} />
 */
export function useSlotClass(slot: CalendarSlot): string | undefined {
  return useContext(CalendarClassesContext)[slot]
}
