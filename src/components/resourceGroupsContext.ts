import { createContext, useContext, useState } from "react"

/** Which resource groups the sidebar shows folded shut, and how to fold or open one. */
export interface ResourceGroupsFolding {
  isCollapsed(group: string): boolean
  toggle(group: string): void
}

/**
 * The folding of the sidebar's groups, held by `Calendar` so it outlives the
 * sidebar being closed and opened again — or by the host, when it passes
 * `collapsedGroups` to keep the choice between visits.
 */
export const ResourceGroupsContext = createContext<ResourceGroupsFolding | null>(null)

/**
 * The folding in force: the calendar's, or — for a `ResourceFilter` drawn on
 * its own — one kept here, every group open.
 */
export function useResourceGroupsFolding(): ResourceGroupsFolding {
  const provided = useContext(ResourceGroupsContext)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set())
  if (provided) return provided
  return {
    isCollapsed: (group) => collapsed.has(group),
    toggle: (group) =>
      setCollapsed((current) => {
        const next = new Set(current)
        if (!next.delete(group)) next.add(group)
        return next
      }),
  }
}
