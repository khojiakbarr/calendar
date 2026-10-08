import { createContext, useContext } from "react"

/** The `groupId` of the event under the pointer, or null. Provided by `Calendar`. */
export const LitGroupContext = createContext<string | null>(null)

/**
 * Whether an event belongs to the record under the pointer.
 *
 * @param groupId - The event's `groupId`; an event with none is never lit.
 * @returns True while one of its record's dates (itself included) is pointed at.
 */
export function useIsLit(groupId: string | undefined): boolean {
  const lit = useContext(LitGroupContext)
  return groupId !== undefined && lit === groupId
}
