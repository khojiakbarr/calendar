import { describe, expect, it } from "vitest"
import { monthRowLimits } from "./MonthView"

describe("monthRowLimits", () => {
  it("fits three events and the overflow dots in a 110px week, leaving no empty line", () => {
    expect(monthRowLimits(110)).toEqual({ maxRows: 3, rowsBesideMore: 3 })
  })

  it("keeps the dots inside a shorter week", () => {
    // 28px head + 2 rows of 22 + the 16px dots' line = 88
    expect(monthRowLimits(88)).toEqual({ maxRows: 2, rowsBesideMore: 2 })
    expect(monthRowLimits(87)).toEqual({ maxRows: 2, rowsBesideMore: 1 })
  })

  it("always shows at least one event row", () => {
    expect(monthRowLimits(20)).toEqual({ maxRows: 1, rowsBesideMore: 0 })
  })
})
