import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import {
  isHtmlPage,
  isNextActionsPage,
  isTrendTargetPage,
  parseDeck,
  type NextActionsPage,
  type Page,
} from "@/lib/deck"

const demoDir = resolve(import.meta.dirname, "../../demo")
const week = parseDeck(
  JSON.parse(readFileSync(resolve(demoDir, "2026-01-05.json"), "utf8"))
)

const CJK = /[一-鿿]/u

function pageAt<T extends Page>(
  index: number,
  hasLayout: (page: Page) => page is T
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

describe("Demo Deck Set", () => {
  it("covers the reporting week with every production layout in order", () => {
    expect(week.period!.start).toBe("2026-01-05")
    expect(week.period!.end).toBe("2026-01-09")
    expect(week.pages.map((page) => page.layout)).toEqual([
      "two-column",
      "overview",
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
  })

  // 公開 demo 的文案統一為英文（3dd5336）；中英混排的版面覆蓋由 e2e fixture 負責
  it("ships English-only copy so the public demo reads consistently", () => {
    expect(JSON.stringify(week)).not.toMatch(CJK)
  })

  describe("Next Actions examples", () => {
    it("shows the Columns Commitments again as Rows", () => {
      const columns = pageAt(3, isNextActionsPage)
      const rows = pageAt(8, isNextActionsPage)

      expect(rows.variant).toBe("rows")
      expect(rows.commitments).toEqual(columns.commitments)
    })

    it("includes longer Rows than the Columns example", () => {
      const longestOutcome = (
        page: ReturnType<typeof pageAt<NextActionsPage>>
      ) => Math.max(...page.commitments.map((item) => item.outcome.length))
      const longRows = pageAt(9, isNextActionsPage)

      expect(longRows.variant).toBe("rows")
      expect(longestOutcome(longRows)).toBeGreaterThan(
        longestOutcome(pageAt(3, isNextActionsPage))
      )
    })
  })

  it("ships the HTML file its HTML Page references", () => {
    const htmlPath = resolve(
      demoDir,
      "2026-01-05",
      pageAt(4, isHtmlPage).htmlFile
    )

    expect(existsSync(htmlPath)).toBe(true)
    expect(readFileSync(htmlPath, "utf8").trim().length).toBeGreaterThan(0)
  })
})
