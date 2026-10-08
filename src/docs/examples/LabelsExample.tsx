import { useState } from "react"
import { Calendar, addDays, addMinutes, startOfDay, useCalendar, type CalendarLabels } from "@/index"
import { createMemorySource } from "./memorySource"

/** Only the keys that differ; everything left out falls back to the English defaults. */
const LANGUAGES: Record<string, { locale: string; labels: Partial<CalendarLabels> }> = {
  English: { locale: "en", labels: {} },
  Русский: {
    locale: "ru",
    labels: { today: "Сегодня", day: "День", week: "Неделя", month: "Месяц", year: "Год", agenda: "Список", newEvent: "Создать", allDay: "Весь день", more: "ещё {n}" },
  },
  "O‘zbekcha": {
    locale: "uz",
    labels: { today: "Bugun", day: "Kun", week: "Hafta", month: "Oy", year: "Yil", agenda: "Reja", newEvent: "Yangi", allDay: "Kun bo‘yi", more: "yana {n}" },
  },
}

const start = addMinutes(addDays(startOfDay(new Date()), 1), 11 * 60)
const source = createMemorySource([{ id: "1", name: "Uchrashuv", start, end: addMinutes(start, 60) }])

/** `locale` names the dates, `labels` names the controls; they are independent. */
export function LabelsExample() {
  const [language, setLanguage] = useState("Русский")
  const { locale, labels } = LANGUAGES[language] ?? { locale: "en", labels: {} }
  const calendar = useCalendar({ id: "docs-labels", source, locale, initialView: "month" })

  return (
    <>
      <label className="docs-toggle">
        Language
        <select value={language} onChange={(event) => setLanguage(event.target.value)}>
          {Object.keys(LANGUAGES).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <Calendar instance={calendar} sidebar={false} height={380} labels={labels} />
    </>
  )
}
