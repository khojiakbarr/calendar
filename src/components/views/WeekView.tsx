import { TimeGrid, type TimeGridProps } from "./TimeGrid"

/** {@link WeekView} takes exactly what the grid takes. */
export type WeekViewProps<T> = TimeGridProps<T>

/**
 * The week view: the shared time grid across `instance.days`.
 *
 * That is seven columns, or five when weekends are hidden — the hook has
 * already dropped them, so the view never decides which days to draw.
 *
 * @param props - The instance, labels, and the editor/tooltip/create callbacks.
 * @returns The grid for the visible week.
 *
 * @example
 * <WeekView instance={instance} labels={labels} onEventOpen={open} … />
 */
export function WeekView<T>(props: WeekViewProps<T>) {
  return <TimeGrid {...props} />
}
