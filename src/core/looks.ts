import type { CalendarEvent, EventTone } from "../types"
import { classNames } from "./classNames"

/** The token each tone is drawn in; `tokens.css` defines them for light and dark. */
export const TONE_COLOR: Record<EventTone, string> = {
  primary: "var(--cal-accent)",
  success: "var(--cal-success)",
  danger: "var(--cal-danger)",
  neutral: "var(--cal-neutral)",
}

/**
 * The tone an event is drawn in: its own, else danger for an overrun — the
 * days past a plan are late by definition — else none.
 *
 * @param event - Any event.
 * @returns The tone, or `undefined` to fall back to the resource's colour.
 */
export function toneOf(event: CalendarEvent<unknown>): EventTone | undefined {
  return event.tone ?? (event.appearance === "overrun" ? "danger" : undefined)
}

/**
 * The classes that give an event its look, the same on every view's chip:
 * `cal-look-*` for a plan, actual or overrun, `cal-marker cal-marker-*` for
 * a one-day mark, then the host's own `className`.
 *
 * @param event - Any event.
 * @returns A class string, empty for an ordinary event.
 *
 * @example
 * classNames("cal-event", eventLookClasses(event))
 */
export function eventLookClasses(event: CalendarEvent<unknown>): string {
  return classNames(
    event.appearance && `cal-look-${event.appearance}`,
    event.marker && `cal-marker cal-marker-${event.marker}`,
    event.className,
  )
}
