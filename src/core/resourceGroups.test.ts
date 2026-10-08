import { describe, expect, it } from "vitest"
import type { CalendarResource } from "../types"
import { groupResources } from "./resourceGroups"

const resource = (id: string, group?: string): CalendarResource => ({ id, name: id, color: "red", ...(group === undefined ? {} : { group }) })

describe("groupResources", () => {
  it("keeps ungrouped resources first, then each group in the order it first appears", () => {
    expect(groupResources([resource("a", "Docs"), resource("x"), resource("b", "Tasks"), resource("c", "Docs")])).toEqual([
      { group: null, resources: [resource("x")] },
      { group: "Docs", resources: [resource("a", "Docs"), resource("c", "Docs")] },
      { group: "Tasks", resources: [resource("b", "Tasks")] },
    ])
  })

  it("returns nothing for no resources", () => {
    expect(groupResources([])).toEqual([])
  })
})
