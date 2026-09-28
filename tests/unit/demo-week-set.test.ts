import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import {
  isHtmlWeekPage,
  isNextActionsPage,
  isTrendTargetPage,
  parseWeekDocument,
  type WeekPage,
} from "@/lib/week-document"

const demoDir = resolve(import.meta.dirname, "../../demo")
const week = parseWeekDocument(
  JSON.parse(readFileSync(resolve(demoDir, "2026-01-05.json"), "utf8"))
)

const CJK = /[一-鿿]/u
const LATIN = /[A-Za-z]/

function pageAt<T extends WeekPage>(
  index: number,
  hasLayout: (page: WeekPage) => page is T
): T {
  const page = week.pages[index]
  if (!page || !hasLayout(page))
    throw new Error(`Unexpected demo layout at page ${index + 1}`)
  return page
}

function measuredValues(index: number): number[] {
  return pageAt(index, isTrendTargetPage).observations.flatMap((entry) =>
    entry.state === "measured" ? [entry.value] : []
  )
}

describe("Demo Week Set", () => {
  it("covers the reporting week with every production layout in order", () => {
    expect(week.start).toBe("2026-01-05")
    expect(week.end).toBe("2026-01-09")
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
  })

  describe("Trend & Target examples", () => {
    it("ends the at-most example just above its target", () => {
      const lower = pageAt(5, isTrendTargetPage)

      expect(lower.direction).toBe("at-most")
      expect(lower.observations.at(-1)).toEqual({
        state: "measured",
        value: 8.04,
      })
    })

    it("includes negative and zero values in the at-least example", () => {
      expect(pageAt(6, isTrendTargetPage).direction).toBe("at-least")
      expect(measuredValues(6).some((value) => value < 0)).toBe(true)
      expect(measuredValues(6)).toContain(0)
    })

    it("ends one example with a Missing week after two measurements", () => {
      expect(pageAt(7, isTrendTargetPage).observations.at(-1)).toEqual({
        state: "missing",
      })
      expect(measuredValues(7).length).toBeGreaterThanOrEqual(2)
    })

    // 兩個方向之外，Trend 也需要一頁中英混排的版面實例
    it("uses mixed-language copy on the Missing-week example", () => {
      const { title } = pageAt(7, isTrendTargetPage)

      expect(title).toMatch(CJK)
      expect(title).toMatch(LATIN)
    })
  })

  describe("Next Actions examples", () => {
    it("shows the Columns Commitments again as Rows", () => {
      const columns = pageAt(3, isNextActionsPage)
      const rows = pageAt(8, isNextActionsPage)

      expect(rows.variant).toBe("rows")
      expect(rows.commitments).toEqual(columns.commitments)
    })

    it("includes longer mixed-language Rows", () => {
      const mixedRows = pageAt(9, isNextActionsPage)

      expect(mixedRows.variant).toBe("rows")
      expect(mixedRows.commitments.some((item) => CJK.test(item.outcome))).toBe(
        true
      )
    })
  })

  it("ships the HTML file its HTML Page references", () => {
    const htmlPath = resolve(
      demoDir,
      "2026-01-05",
      pageAt(4, isHtmlWeekPage).htmlFile
    )

    expect(existsSync(htmlPath)).toBe(true)
    expect(readFileSync(htmlPath, "utf8").trim().length).toBeGreaterThan(0)
  })
})
