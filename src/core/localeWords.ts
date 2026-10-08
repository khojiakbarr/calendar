/**
 * Date words for a language the browser's `Intl` cannot name dates in.
 *
 * Chrome ships no Latin Uzbek date names: `Intl.DateTimeFormat("uz", { month:
 * "long" })` gives "M10" there (Node and Firefox give "oktabr"). A calendar in
 * Uzbek would read "M10 2026" in its title. These are CLDR's words, used only
 * where the engine has none of its own.
 */
export interface LocaleWords {
  /** January first, standalone (as a title shows them). */
  months: readonly string[]
  monthsShort: readonly string[]
  /** Sunday first, as `Date.getDay()` counts. */
  weekdays: readonly string[]
  weekdaysShort: readonly string[]
  weekdaysNarrow: readonly string[]
}

const UZBEK: LocaleWords = {
  months: ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"],
  monthsShort: ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"],
  weekdays: ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"],
  weekdaysShort: ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"],
  weekdaysNarrow: ["Y", "D", "S", "C", "P", "J", "S"],
}

/** A month the engine could not name comes back as its number: "M10", "10". */
const UNNAMED = /^M?\d+$/

const known = new Map<string, LocaleWords | null>()

/**
 * The words to use for `locale` when the engine has none, else null — the
 * engine's `Intl` then names the dates itself. Today only Latin Uzbek
 * (`uz`, `uz-Latn`, `uz-UZ`, …); Cyrillic Uzbek is left to the engine.
 *
 * @param locale - A BCP 47 tag.
 * @param engineNamesMonths - Whether the engine names months for `locale`; for tests.
 */
export function fallbackWords(locale: string, engineNamesMonths: (locale: string) => boolean = namesMonths): LocaleWords | null {
  const cached = known.get(locale)
  if (cached !== undefined && engineNamesMonths === namesMonths) return cached
  const isLatinUzbek = /^uz(?:-latn)?(?:-[a-z]{2})?$/i.test(locale)
  const words = isLatinUzbek && !engineNamesMonths(locale) ? UZBEK : null
  if (engineNamesMonths === namesMonths) known.set(locale, words)
  return words
}

/** Whether the engine names January in `locale`, rather than numbering it. */
function namesMonths(locale: string): boolean {
  try {
    return !UNNAMED.test(new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(2000, 0, 15)))
  } catch {
    return false
  }
}
