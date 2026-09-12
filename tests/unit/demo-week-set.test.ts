import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import {
  isEvidenceDecisionPage,
  isHtmlWeekPage,
  isNextActionsPage,
  isTwoColumnWeekPage,
  isWeeklyOverviewPage,
  parseWeekDocument,
} from "@/lib/week-document"

const demoWeekPath = resolve(import.meta.dirname, "../../demo/2026-01-05.json")

describe("Demo Week Set", () => {
  it("is accepted by the production parser with all five layouts and HTML asset", () => {
    const week = parseWeekDocument(
      JSON.parse(readFileSync(demoWeekPath, "utf8"))
    )

    expect(week.start).toBe("2026-01-05")
    expect(week.end).toBe("2026-01-09")
    expect(week.pages).toHaveLength(5)
    expect(week.pages.map((page) => page.layout)).toEqual([
      "two-column",
      "weekly-overview",
      "evidence-decision",
      "next-actions",
      "html",
    ])

    expect(isTwoColumnWeekPage(week.pages[0])).toBe(true)
    expect(isWeeklyOverviewPage(week.pages[1])).toBe(true)
    expect(isEvidenceDecisionPage(week.pages[2])).toBe(true)
    expect(isNextActionsPage(week.pages[3])).toBe(true)
    expect(isHtmlWeekPage(week.pages[4])).toBe(true)

    const htmlPage = week.pages[4]
    if (!isHtmlWeekPage(htmlPage)) {
      throw new Error("expected html page")
    }

    const htmlPath = resolve(
      import.meta.dirname,
      "../../demo/2026-01-05",
      htmlPage.htmlFile
    )
    expect(existsSync(htmlPath)).toBe(true)
    expect(readFileSync(htmlPath, "utf8").trim().length).toBeGreaterThan(0)
  })
})
