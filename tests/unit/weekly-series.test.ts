import { describe, expect, it } from "vitest"

import {
  defaultDeckId,
  latestWeekMonday,
  nextMondayAfter,
  planWeekFromPrevious,
  weekRangeForMonday,
} from "@/lib/weekly-series"
import { isCalendarMonday } from "@/lib/calendar-date"

describe("weekly-series", () => {
  it("names the new week file for the target Monday and Friday range", () => {
    expect(weekRangeForMonday("2026-08-31")).toEqual({
      start: "2026-08-31",
      end: "2026-09-04",
    })
    expect(isCalendarMonday("2026-08-31")).toBe(true)
    expect(isCalendarMonday("2026-09-01")).toBe(false)
  })

  it("rejects a nonexistent Monday instead of silently moving the reporting week", () => {
    expect(() => weekRangeForMonday("2026-02-30")).toThrow(
      "Invalid date: 2026-02-30"
    )
  })

  it("picks the latest week and the following Monday", () => {
    expect(latestWeekMonday(["2026-08-17", "2026-08-24"])).toBe("2026-08-24")
    expect(latestWeekMonday(["2026-08-17", "q4-roadmap"])).toBe("2026-08-17")
    expect(latestWeekMonday(["q4-roadmap"])).toBeNull()
    expect(nextMondayAfter("2026-08-24")).toBe("2026-08-31")
  })

  it("opens the latest week by default and falls back to the last deck", () => {
    expect(defaultDeckId(["2026-08-17", "2026-08-24", "q4-roadmap"])).toBe(
      "2026-08-24"
    )
    expect(defaultDeckId(["q3-review", "q4-roadmap"])).toBe("q4-roadmap")
    expect(defaultDeckId([])).toBeUndefined()
  })

  describe("planWeekFromPrevious", () => {
    it("uses the latest Monday deck as the template and a Monday–Friday period", () => {
      expect(
        planWeekFromPrevious(
          ["2026-08-17", "2026-08-24", "q4-roadmap"],
          "2026-08-31"
        )
      ).toEqual({
        templateId: "2026-08-24",
        period: { start: "2026-08-31", end: "2026-09-04" },
      })
    })

    it("refuses when no Monday deck can serve as the template", () => {
      expect(() => planWeekFromPrevious(["q4-roadmap"], "2026-08-31")).toThrow(
        "No previous week to clone"
      )
    })

    it("refuses a target that is not a calendar Monday", () => {
      expect(() => planWeekFromPrevious(["2026-08-24"], "2026-09-01")).toThrow(
        "Week file name must be a Monday date: 2026-09-01"
      )
    })
  })
})
