import { describe, expect, it, vi } from "vitest"
import { fallbackWords } from "./localeWords"

describe("date words where the engine has none", () => {
  const chrome = () => false // Chrome: no Latin Uzbek month names
  const node = () => true

  it("gives Latin Uzbek CLDR's words when the engine cannot name its months", () => {
    expect(fallbackWords("uz", chrome)?.months[9]).toBe("Oktabr")
    expect(fallbackWords("uz-Latn-UZ", chrome)?.weekdays[4]).toBe("payshanba")
    expect(fallbackWords("uz-UZ", chrome)?.weekdaysNarrow).toHaveLength(7)
  })

  it("leaves a language the engine names, and every other language, to the engine", () => {
    expect(fallbackWords("uz", node)).toBeNull()
    expect(fallbackWords("ru", chrome)).toBeNull()
    expect(fallbackWords("uz-Cyrl", chrome)).toBeNull()
  })

  it("formats an Uzbek title from the words when the engine numbers the month", async () => {
    vi.resetModules()
    vi.doMock("./localeWords", async (load) => {
      const real = await load<typeof import("./localeWords")>()
      return { ...real, fallbackWords: (locale: string) => real.fallbackWords(locale, chrome) }
    })
    const format = await import("./format")
    const day = new Date(2026, 9, 8)
    expect(format.formatTitle("month", day, "uz")).toBe("Oktabr 2026")
    expect(format.formatTitle("day", day, "uz")).toBe("8-okt, 2026")
    expect(format.formatDayMonth(day, "uz")).toBe("8-okt")
    expect(format.formatWeekday(day, "uz", "short")).toBe("Pay")
    expect(format.formatFullDate(day, "uz")).toBe("payshanba, 8-oktabr, 2026")
    vi.doUnmock("./localeWords")
  })
})
