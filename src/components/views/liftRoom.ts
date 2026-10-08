/** The widest a lifted month or all-day chip grows to show its name (`hover.css`). */
export const LIFT_MAX_PX = 280
/** Kept clear of the row's edge, as a chip's own side margins are. */
const EDGE_GAP_PX = 4

/**
 * Readies a month or all-day chip for its lift: which way it may grow and how
 * far. A lifted chip widens to fit its name, and one near the row's right
 * edge — Sunday's — used to grow past the calendar and make the whole page
 * scroll sideways. So it grows toward the side with more room, never past
 * the row: `data-lift` is `end` (it grows rightwards) or `start` (leftwards),
 * and `--cal-lift-room` caps its width. A time-grid chip only takes its own
 * column and needs none of this.
 *
 * @param chip - The chip the pointer (or focus) is on.
 *
 * @example
 * onMouseEnter={(event) => prepareLift(event.currentTarget)}
 */
export function prepareLift(chip: HTMLElement): void {
  if (!chip.matches(".cal-month-event, .cal-allday-pill")) return
  const row = chip.parentElement
  if (!row) return
  const own = chip.getBoundingClientRect()
  const box = row.getBoundingClientRect()
  const roomRight = box.right - own.left - EDGE_GAP_PX
  const roomLeft = own.right - box.left - EDGE_GAP_PX
  const growsLeft = roomRight < LIFT_MAX_PX && roomLeft > roomRight
  chip.dataset["lift"] = growsLeft ? "start" : "end"
  chip.style.setProperty("--cal-lift-room", `${Math.max(Math.floor(growsLeft ? roomLeft : roomRight), Math.ceil(own.width))}px`)
}
