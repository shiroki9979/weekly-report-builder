import { describe, expect, it } from "vitest"

import {
  daysUntilMonday,
  formatCalendarDate,
  parseCalendarDate,
} from "@/lib/calendar-date"

describe("calendar-date", () => {
  it("round-trips an ISO date through a UTC date", () => {
    expect(formatCalendarDate(parseCalendarDate("2026-12-31"))).toBe(
      "2026-12-31"
    )
  })

  it("rejects a date the calendar does not have", () => {
    expect(() => parseCalendarDate("2026-02-30")).toThrow(
      "Invalid date: 2026-02-30"
    )
  })

  it("counts the days to the same or next Monday", () => {
    // 2026-07-06 是週一、2026-07-05 是週日、2026-07-07 是週二
    expect(daysUntilMonday(parseCalendarDate("2026-07-06"))).toBe(0)
    expect(daysUntilMonday(parseCalendarDate("2026-07-05"))).toBe(1)
    expect(daysUntilMonday(parseCalendarDate("2026-07-07"))).toBe(6)
  })
})
