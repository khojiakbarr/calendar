import { createContext } from "react"

/**
 * The theme the nearest `<Calendar>` was given, for layers rendered outside it.
 *
 * The editor and the tooltip are portaled to `<body>` so no scrolling grid can
 * clip them — which also puts them outside the `.cal-root` that defines every
 * design token and carries `data-theme`. Floating layers read this context and
 * stamp the same theme on their own token-carrying wrapper.
 */
export const CalendarThemeContext = createContext<"light" | "dark" | undefined>(undefined)
