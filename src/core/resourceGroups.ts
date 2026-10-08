import type { CalendarResource } from "../types"

/** Resources under one heading of the sidebar's filter; `group: null` holds those with none. */
export interface ResourceGroup {
  group: string | null
  resources: CalendarResource[]
}

/**
 * The sidebar's sections: resources with no `group` first, as one block with
 * no heading, then each group in the order its first resource appears.
 *
 * @param resources - The calendar's resources, in the host's order.
 * @returns The sections; empty for no resources.
 *
 * @example
 * groupResources(instance.resources).map(({ group, resources }) => …)
 */
export function groupResources(resources: readonly CalendarResource[]): ResourceGroup[] {
  const ungrouped: CalendarResource[] = []
  const byGroup = new Map<string, CalendarResource[]>()
  for (const resource of resources) {
    if (resource.group === undefined) {
      ungrouped.push(resource)
      continue
    }
    const members = byGroup.get(resource.group)
    if (members) members.push(resource)
    else byGroup.set(resource.group, [resource])
  }
  return [
    ...(ungrouped.length > 0 ? [{ group: null, resources: ungrouped }] : []),
    ...[...byGroup].map(([group, members]) => ({ group, resources: members })),
  ]
}
