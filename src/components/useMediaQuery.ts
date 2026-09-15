import { useEffect, useState } from "react"

/**
 * Whether `query` currently matches, or `false` when `matchMedia` is not
 * available at all (server-side rendering, or a test environment that does
 * not implement it) — the safe default is "not narrow", i.e. a modal rather
 * than a sheet.
 */
function readMatch(query: string): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false
  return window.matchMedia(query).matches
}

/**
 * Tracks whether a CSS media query currently matches, live.
 *
 * SSR-safe: the initial render always reads `false` on the server (there is
 * no `window`), then reconciles to the real value once mounted in the
 * browser via the effect below — the same lazy-init-then-correct pattern
 * every other browser-only read in this library follows. Also degrades to
 * `false` in a test environment that has no `matchMedia` at all, rather than
 * throwing, so a suite that never touches viewport width does not need to
 * stub it.
 *
 * @param query - A CSS media query string, e.g. `"(max-width: 640px)"`.
 * @returns Whether `query` currently matches.
 *
 * @example
 * const isNarrow = useMediaQuery("(max-width: 640px)")
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => readMatch(query))

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return
    const mediaQueryList = window.matchMedia(query)
    const handleChange = () => setMatches(mediaQueryList.matches)
    handleChange() // `query` itself may have changed since the initial render
    mediaQueryList.addEventListener("change", handleChange)
    return () => mediaQueryList.removeEventListener("change", handleChange)
  }, [query])

  return matches
}
