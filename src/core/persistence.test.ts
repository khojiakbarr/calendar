import { describe, it, expect, beforeEach } from "vitest"
import type { CalendarPreferences } from "../types"
import { localStoragePreferences, noPreferenceStorage, prunePreferences } from "./persistence"

describe("persistence", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe("localStoragePreferences", () => {
    it("saves and loads preferences round-trip", () => {
      const storage = localStoragePreferences()
      const prefs: CalendarPreferences = {
        view: "week",
        showWeekends: false,
        hiddenResourceIds: ["res-2"],
      }

      storage.save("cal-1", prefs)
      const loaded = storage.load("cal-1")

      expect(loaded).toEqual(prefs)
    })

    it("returns null for non-existent entries", () => {
      const storage = localStoragePreferences()
      const loaded = storage.load("cal-nonexistent")
      expect(loaded).toBe(null)
    })

    it("returns null when version does not match", () => {
      const storage = localStoragePreferences()
      const prefix = "calendar:prefs:"

      localStorage.setItem(prefix + "cal-1", JSON.stringify({ v: 99, preferences: {} }))
      const loaded = storage.load("cal-1")

      expect(loaded).toBe(null)
    })

    it("swallows storage quota errors gracefully", () => {
      const storage = localStoragePreferences()
      const prefs: CalendarPreferences = {
        view: "month",
        showWeekends: true,
        hiddenResourceIds: [],
      }

      // Mock quota error
      const originalSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = () => {
        throw new Error("QuotaExceededError")
      }

      expect(() => {
        storage.save("cal-1", prefs)
      }).not.toThrow()

      Storage.prototype.setItem = originalSetItem
    })
  })

  describe("noPreferenceStorage", () => {
    it("always returns null on load", () => {
      const storage = noPreferenceStorage()
      expect(storage.load("cal-1")).toBe(null)
    })

    it("does not save anything", () => {
      const storage = noPreferenceStorage()
      storage.save("cal-1", { view: "day", showWeekends: true, hiddenResourceIds: [] })
      expect(storage.load("cal-1")).toBe(null)
    })
  })

  describe("prunePreferences", () => {
    it("keeps valid view and showWeekends", () => {
      const stored: Partial<CalendarPreferences> = {
        view: "week",
        showWeekends: false,
      }
      const pruned = prunePreferences(stored, [])
      expect(pruned.view).toBe("week")
      expect(pruned.showWeekends).toBe(false)
    })

    it("drops invalid view", () => {
      const stored = {
        view: "invalid" as any,
        showWeekends: true,
      }
      const pruned = prunePreferences(stored, [])
      expect(pruned.view).toBeUndefined()
      expect(pruned.showWeekends).toBe(true)
    })

    it("drops non-boolean showWeekends", () => {
      const stored = {
        view: "month" as const,
        showWeekends: "yes" as unknown,
      }
      const pruned = prunePreferences(stored as Partial<CalendarPreferences>, [])
      expect(pruned.showWeekends).toBeUndefined()
    })

    it("keeps only known hidden resource IDs", () => {
      const stored: Partial<CalendarPreferences> = {
        hiddenResourceIds: ["res-1", "res-2", "res-99"],
      }
      const pruned = prunePreferences(stored, ["res-1", "res-2"])
      expect(pruned.hiddenResourceIds).toEqual(["res-1", "res-2"])
    })

    it("removes all hidden resources if none are known", () => {
      const stored: Partial<CalendarPreferences> = {
        hiddenResourceIds: ["res-1", "res-2"],
      }
      const pruned = prunePreferences(stored, [])
      expect(pruned.hiddenResourceIds).toEqual([])
    })
  })
})
