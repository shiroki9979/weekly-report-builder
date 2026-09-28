import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import {
  isEvidenceDecisionPage,
  isHtmlWeekPage,
  isNextActionsPage,
  isTrendTargetPage,
  isTwoColumnWeekPage,
  isWeeklyOverviewPage,
  parseWeekDocument,
} from "@/lib/week-document"

const demoWeekPath = resolve(import.meta.dirname, "../../demo/2026-01-05.json")

describe("Demo Week Set", () => {
  it("provides public production examples for both selected layouts", () => {
    const week = parseWeekDocument(
      JSON.parse(readFileSync(demoWeekPath, "utf8"))
    )

    expect(week.start).toBe("2026-01-05")
    expect(week.end).toBe("2026-01-09")
    expect(week.pages).toHaveLength(10)
    expect(week.pages.map((page) => page.layout)).toEqual([
      "two-column",
      "weekly-overview",
      "evidence-decision",
      "next-actions",
      "html",
      "trend-target",
      "trend-target",
      "trend-target",
      "next-actions",
      "next-actions",
    ])

    expect(isTwoColumnWeekPage(week.pages[0])).toBe(true)
    expect(isWeeklyOverviewPage(week.pages[1])).toBe(true)
    expect(isEvidenceDecisionPage(week.pages[2])).toBe(true)
    expect(isNextActionsPage(week.pages[3])).toBe(true)
    expect(isHtmlWeekPage(week.pages[4])).toBe(true)
    const [lower, higher, noData, rows, mixedRows] = week.pages.slice(5)
    expect(isTrendTargetPage(lower)).toBe(true)
    expect(isTrendTargetPage(higher)).toBe(true)
    expect(isTrendTargetPage(noData)).toBe(true)
    expect(isNextActionsPage(rows)).toBe(true)
    expect(isNextActionsPage(mixedRows)).toBe(true)
    if (
      !isTrendTargetPage(lower) ||
      !isTrendTargetPage(higher) ||
      !isTrendTargetPage(noData) ||
      !isNextActionsPage(rows) ||
      !isNextActionsPage(mixedRows)
    )
      throw new Error("expected complete layout examples")
    expect(lower.direction).toBe("at-most")
    expect(lower.observations.at(-1)).toEqual({
      state: "measured",
      value: 8.04,
    })
    expect(higher.direction).toBe("at-least")
    expect(
      higher.observations.some(
        (item) => item.state === "measured" && item.value < 0
      )
    ).toBe(true)
    expect(
      higher.observations.some(
        (item) => item.state === "measured" && item.value === 0
      )
    ).toBe(true)
    expect(noData.observations.at(-1)).toEqual({ state: "missing" })
    // 兩個方向之外，Trend 也需要一頁中英混排的版面實例
    expect(noData.title).toMatch(/[\u4e00-\u9fff]/u)
    expect(noData.title).toMatch(/[A-Za-z]/)
    expect(
      noData.observations.filter((item) => item.state === "measured").length
    ).toBeGreaterThanOrEqual(2)
    expect(rows.variant).toBe("rows")
    expect(rows.commitments).toEqual(
      week.pages[3] && isNextActionsPage(week.pages[3])
        ? week.pages[3].commitments
        : []
    )
    expect(mixedRows.variant).toBe("rows")
    expect(
      mixedRows.commitments.some((item) =>
        /[\u4e00-\u9fff]/u.test(item.outcome)
      )
    ).toBe(true)

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
