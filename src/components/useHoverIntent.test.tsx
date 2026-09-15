import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useHoverIntent, type HoverTarget } from "./useHoverIntent"
import type { AnchorRect } from "./Popover"

interface TestEvent {
  id: string
}

const anchor: AnchorRect = { top: 0, left: 0, width: 10, height: 10 }
const target: HoverTarget<TestEvent> = { event: { id: "e1" }, anchor }

describe("useHoverIntent", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("sets target only after the delay elapses", () => {
    const { result } = renderHook(() => useHoverIntent<TestEvent>(400))
    expect(result.current.target).toBeNull()

    act(() => {
      result.current.show(target)
    })
    expect(result.current.target).toBeNull() // pending, not yet shown

    act(() => {
      vi.advanceTimersByTime(399)
    })
    expect(result.current.target).toBeNull()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.target).toEqual(target)
  })

  it("cancels the pending show when hide is called before the delay elapses", () => {
    const { result } = renderHook(() => useHoverIntent<TestEvent>(400))

    act(() => {
      result.current.show(target)
    })
    act(() => {
      vi.advanceTimersByTime(200)
      result.current.hide()
    })
    expect(result.current.target).toBeNull()

    // The cancelled timer must never fire, even once the original delay has passed.
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(result.current.target).toBeNull()
  })

  it("hide clears an already-shown target immediately", () => {
    const { result } = renderHook(() => useHoverIntent<TestEvent>(400))

    act(() => {
      result.current.show(target)
      vi.advanceTimersByTime(400)
    })
    expect(result.current.target).toEqual(target)

    act(() => {
      result.current.hide()
    })
    expect(result.current.target).toBeNull()
  })
})
