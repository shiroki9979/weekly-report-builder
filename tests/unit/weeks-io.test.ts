import { describe, expect, it } from "vitest"

import { serializeWeekDocument } from "@/lib/weeks-io"
import { parseWeekDocument } from "@/lib/week-document"
import { setPageTitle } from "@/lib/week-editor"

describe("serializeWeekDocument", () => {
  it("round-trips a week document through JSON", () => {
    const week = parseWeekDocument({
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          id: "p01",
          layout: "two-column",
          title: "Weekly Report",
          items: [
            { heading: "One", body: "First" },
            { heading: "Two", body: "Second" },
            { heading: "Three", body: "Third" },
          ],
          panel: {
            kind: "table",
            title: "Summary",
            columns: ["A", "B"],
            rows: [{ cells: ["x", "y"] }],
          },
          hidden: true,
          notes: "Remember the chart",
        },
      ],
    })

    const edited = setPageTitle(week, 0, "Weekly Report · edited")
    const roundTrip = parseWeekDocument(
      JSON.parse(serializeWeekDocument(edited))
    )

    expect(roundTrip.pages[0].title).toBe("Weekly Report · edited")
    expect(roundTrip.pages[0].hidden).toBe(true)
    expect(roundTrip.pages[0].notes).toBe("Remember the chart")
  })
})
