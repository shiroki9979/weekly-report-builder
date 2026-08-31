import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { parseWeekDocument } from "@/lib/week-document"

const fixturePath = resolve(
  import.meta.dirname,
  "../../weeks/2026-08-24.json"
)

describe("parseWeekDocument", () => {
  it("parses the week fixture with two-column layout and table panel", () => {
    const raw = readFileSync(fixturePath, "utf-8")
    const week = parseWeekDocument(JSON.parse(raw))

    expect(week.start).toBe("2026-08-24")
    expect(week.end).toBe("2026-08-28")
    expect(week.pages).toHaveLength(2)

    const page = week.pages[1]
    expect(page.layout).toBe("two-column")
    expect(page.title).toBe("Platform · Eval Gate")
    expect(page.items).toHaveLength(3)
    expect(page.items[0].heading).toBe("Task-scoped evaluation metrics")
    expect(page.panel.kind).toBe("table")

    if (page.panel.kind !== "table") {
      throw new Error("expected table panel")
    }

    expect(page.panel.columns).toEqual(["Action", "Production", "Outcome"])
    expect(page.panel.rows[0].cells).toEqual([
      "Scheduled eval",
      "Pinned",
      "Skip promote",
    ])
  })

  it("rejects documents without pages", () => {
    expect(() =>
      parseWeekDocument({ start: "2026-08-24", end: "2026-08-28", pages: [] })
    ).toThrow(/pages/i)
  })
})
