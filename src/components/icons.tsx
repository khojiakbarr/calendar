/** Which way a chevron points, and whether it is doubled (a year's step beside a month's). */
export interface ChevronIconProps {
  direction: "left" | "right"
  double?: boolean
}

const CHEVRON_PATHS = {
  left: "M10 4 6 8l4 4",
  right: "M6 4l4 4-4 4",
  doubleLeft: "M8 4 4 8l4 4M12 4 8 8l4 4",
  doubleRight: "M4 4l4 4-4 4M8 4l4 4-4 4",
} as const

/**
 * A step chevron, drawn rather than typed: a «‹ › « »» glyph sits on its font's
 * baseline, a few pixels off the middle of a small square button; a drawing
 * is centred whatever the font.
 *
 * @example
 * <button className="cal-icon-btn" aria-label="Next year"><ChevronIcon direction="right" double /></button>
 */
export function ChevronIcon({ direction, double = false }: ChevronIconProps) {
  const path = double ? (direction === "left" ? CHEVRON_PATHS.doubleLeft : CHEVRON_PATHS.doubleRight) : CHEVRON_PATHS[direction]
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d={path} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
