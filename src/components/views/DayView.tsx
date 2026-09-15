import { TimeGrid, type TimeGridProps } from "./TimeGrid"

/** {@link DayView} takes exactly what the grid takes. */
export type DayViewProps<T> = TimeGridProps<T>

/**
 * The day view: one column of the shared time grid.
 *
 * It needs no layout of its own — `instance.days` already holds the single day
 * for this view, so day and week differ only in how many columns they hand the
 * grid. Kept as a named component anyway so the shell can switch on views by
 * name and so the day view keeps its own place to grow.
 *
 * @param props - The instance, labels, and the editor/tooltip/create callbacks.
 * @returns The grid for a single day.
 *
 * @example
 * <DayView instance={instance} labels={labels} onEventOpen={open} … />
 */
export function DayView<T>(props: DayViewProps<T>) {
  return <TimeGrid {...props} />
}
