/**
 * A rectangle in viewport pixels — what a popover anchors itself to.
 *
 * Deliberately a plain shape rather than `DOMRect`: a gesture can end on a
 * slot that has no element of its own (the empty grid a drag just swept), so
 * the anchor has to be describable without one. `Popover` declares the same
 * four fields, and structural typing makes the two interchangeable without
 * either file importing the other.
 */
export interface AnchorRect {
  top: number
  left: number
  width: number
  height: number
}

/**
 * The viewport rectangle of an element, as an {@link AnchorRect}.
 *
 * Copies the four fields instead of passing the live `DOMRect` on, because a
 * `DOMRect` read during a drag goes stale the moment the grid scrolls, and a
 * popover that keeps a reference would follow it.
 *
 * @param el - The element to measure.
 * @returns Its position and size in viewport pixels.
 *
 * @example
 * onEventOpen(event, chipElement) // → rectOf(chipElement) anchors the editor
 */
export function rectOf(el: HTMLElement): AnchorRect {
  const rect = el.getBoundingClientRect()
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
}
