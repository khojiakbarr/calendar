/**
 * An example module's source as a consumer would write it.
 *
 * The examples import the library from `@/index` so they run against this
 * checkout; the page shows `@hojiakbar_dev/calendar`, which is what the reader
 * will type. That is the only difference between the code that runs and the
 * code that is shown.
 *
 * @param source - An example module's text, imported with `?raw`.
 * @returns The same text with the library's import specifier swapped.
 *
 * @example
 * consumerSource('import { Calendar } from "@/index"')
 * // 'import { Calendar } from "@hojiakbar_dev/calendar"'
 */
export function consumerSource(source: string): string {
  return source.replace(/(from\s+)"@\/index"/g, '$1"@hojiakbar_dev/calendar"')
}
