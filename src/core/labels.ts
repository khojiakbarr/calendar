/**
 * Replace placeholders in a template string.
 *
 * Every `{key}` occurrence in the template is replaced with the string or
 * number value from the vars object. Missing keys are left as-is.
 *
 * @param template - Template string with `{key}` placeholders.
 * @param vars - Variables to substitute.
 * @returns The filled string.
 *
 * @example
 * fill("Week {n}", { n: 11 }) // "Week 11"
 * fill("{name}, {start} to {end}", { name: "Meeting", start: "9:00", end: "10:00" })
 * // "Meeting, 9:00 to 10:00"
 */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/{(\w+)}/g, (match, key) => {
    const value = vars[key]
    return value !== undefined ? String(value) : match
  })
}
