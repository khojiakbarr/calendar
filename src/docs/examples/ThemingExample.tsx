import { useState } from "react"
import { Calendar, addMinutes, startOfDay, useCalendar } from "@/index"
import { createMemorySource } from "./memorySource"

/** A host's override: unlayered, so it beats the library's `@layer calendar` rules without `!important`. */
const BRAND_CSS = `
.brand-violet {
  --cal-accent: #7c3aed;
  --cal-accent-soft: #ede9fe;
  --cal-event-radius: 2px;
  --cal-hour-height: 40px;
}`

const start = addMinutes(startOfDay(new Date()), 10 * 60)
const source = createMemorySource([{ id: "1", name: "Design review", start, end: addMinutes(start, 90) }])

/** Tokens restyle the calendar; `theme` pins light or dark instead of following the OS. */
export function ThemingExample() {
  const [theme, setTheme] = useState<"light" | "dark" | undefined>(undefined)
  const [isBranded, setIsBranded] = useState(true)
  const calendar = useCalendar({ id: "docs-theming", source, initialView: "week" })

  return (
    <>
      <style>{BRAND_CSS}</style>
      <div className="docs-actions">
        <label className="docs-toggle">
          theme
          <select value={theme ?? "system"} onChange={(event) => setTheme(event.target.value === "system" ? undefined : event.target.value === "dark" ? "dark" : "light")}>
            <option>system</option>
            <option>light</option>
            <option>dark</option>
          </select>
        </label>
        <label className="docs-toggle">
          <input type="checkbox" checked={isBranded} onChange={(event) => setIsBranded(event.target.checked)} />
          Apply the .brand-violet tokens
        </label>
      </div>
      <Calendar instance={calendar} sidebar={false} height={340} {...(theme ? { theme } : {})} {...(isBranded ? { className: "brand-violet" } : {})} />
    </>
  )
}
