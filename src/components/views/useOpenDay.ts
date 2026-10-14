import { useCallback, useState } from "react"
import type { AnchorRect } from "../Popover"
import { rectOf } from "./anchor"

/** A day whose overflow card is open: its key, and the button that opened it — the card's anchor and an opened event's. */
export interface OpenDay {
  dayKey: string
  trigger: HTMLElement
  anchor: AnchorRect
}

/** What {@link useOpenDay} hands its view. */
export interface OpenDayState {
  /** The open card's day, or `null` — also `null` once the view shows other days. */
  openDay: OpenDay | null
  /** Opens a day's card, anchored to the button pressed. */
  openDayCard: (dayKey: string, trigger: HTMLElement) => void
  closeDayCard: () => void
}

/**
 * The one day card a view may have open — the month's "+N" and the time grid's all-day "+N" alike. Kept with the
 * days it was opened over, so stepping to another week or month shows none rather than a card for a day off screen.
 *
 * @param days - The days the view shows now (`instance.days`); a new array closes the card.
 * @returns The open day and the handlers that open and close it.
 *
 * @example
 * const { openDay, openDayCard, closeDayCard } = useOpenDay(instance.days)
 * <MonthMore onOpen={(trigger) => openDayCard(dayKey, trigger)} … />
 */
export function useOpenDay(days: readonly Date[]): OpenDayState {
  const [state, setState] = useState<{ days: readonly Date[]; day: OpenDay } | null>(null)
  const openDayCard = useCallback(
    (dayKey: string, trigger: HTMLElement): void => setState({ days, day: { dayKey, trigger, anchor: rectOf(trigger) } }),
    [days],
  )
  const closeDayCard = useCallback((): void => setState(null), [])
  return { openDay: state?.days === days ? state.day : null, openDayCard, closeDayCard }
}
