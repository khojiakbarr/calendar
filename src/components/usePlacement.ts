import { useLayoutEffect, useState, type RefObject } from "react"
import type { AnchorRect } from "./Popover"

/** Gap kept between a floating element and the anchor it hangs off. */
const GAP_PX = 8
/** Smallest gap kept between a floating element and the edge of the viewport. */
const VIEWPORT_MARGIN_PX = 8

/** Where a floating element should render, in `position: fixed` coordinates. */
export interface Placement {
  top: number
  left: number
}

/**
 * Placement rules shared by {@link Popover} and `EventTooltip`: float to the
 * right of the anchor when there's room, else to the left, else below, else
 * centred in the viewport — always clamped fully on screen.
 *
 * Measures the floating element itself (`ref`) rather than trusting a fixed
 * size, since the editor and the tooltip are different sizes. Runs in
 * `useLayoutEffect` so the browser paints the placed position directly
 * instead of a flash at the naive spot, and again on window resize.
 *
 * @param anchor - The rectangle to float near, in viewport coordinates, or
 *   `null` to centre in the viewport.
 * @param ref - The floating element to measure and place.
 * @returns The `top`/`left` to render the element at.
 */
export function usePlacement(anchor: AnchorRect | null, ref: RefObject<HTMLElement | null>): Placement {
  const [placement, setPlacement] = useState<Placement>(() => computePlacement(anchor, 0, 0))

  useLayoutEffect(() => {
    function recompute() {
      const size = ref.current?.getBoundingClientRect()
      setPlacement(computePlacement(anchor, size?.width ?? 0, size?.height ?? 0))
    }
    recompute()
    window.addEventListener("resize", recompute)
    return () => window.removeEventListener("resize", recompute)
  }, [anchor, ref])

  return placement
}

/** Pure placement math, kept apart from the effect so it needs no DOM to test. */
function computePlacement(anchor: AnchorRect | null, width: number, height: number): Placement {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  if (!anchor) return center(width, height, viewportWidth, viewportHeight)

  const spaceRight = viewportWidth - (anchor.left + anchor.width + GAP_PX)
  const spaceLeft = anchor.left - GAP_PX
  const spaceBelow = viewportHeight - (anchor.top + anchor.height + GAP_PX)

  if (spaceRight >= width + VIEWPORT_MARGIN_PX) {
    return clamp(anchor.left + anchor.width + GAP_PX, anchor.top, width, height, viewportWidth, viewportHeight)
  }
  if (spaceLeft >= width + VIEWPORT_MARGIN_PX) {
    return clamp(anchor.left - GAP_PX - width, anchor.top, width, height, viewportWidth, viewportHeight)
  }
  if (spaceBelow >= height + VIEWPORT_MARGIN_PX) {
    return clamp(anchor.left, anchor.top + anchor.height + GAP_PX, width, height, viewportWidth, viewportHeight)
  }
  return center(width, height, viewportWidth, viewportHeight)
}

function center(width: number, height: number, viewportWidth: number, viewportHeight: number): Placement {
  return clamp((viewportWidth - width) / 2, (viewportHeight - height) / 2, width, height, viewportWidth, viewportHeight)
}

/** Pulls `(left, top)` fully inside the viewport, leaving {@link VIEWPORT_MARGIN_PX} on every edge. */
function clamp(left: number, top: number, width: number, height: number, viewportWidth: number, viewportHeight: number): Placement {
  return {
    left: clampAxis(left, width, viewportWidth),
    top: clampAxis(top, height, viewportHeight),
  }
}

function clampAxis(start: number, size: number, viewport: number): number {
  const furthest = viewport - size - VIEWPORT_MARGIN_PX
  return Math.max(VIEWPORT_MARGIN_PX, Math.min(start, furthest))
}
