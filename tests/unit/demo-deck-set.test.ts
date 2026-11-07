import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { serializeDeck } from "@/lib/decks-io"
import { assessExportEligibility } from "@/lib/export-readiness"
import { ADDABLE_PANEL_KINDS } from "@/lib/page-lifecycle"
import { trendEndDate } from "@/lib/trend-target"

import {
  DECK_THEMES,
  isFullWidthPanelPage,
  isHtmlPage,
  isNextActionsPage,
  isTrendTargetPage,
  isTwoColumnPage,
  type NextActionsPage,
  type SlideLayout,
  type TrendTargetPage,
} from "@/lib/deck"
import { readDemoDecks } from "../demo-decks"

const demoDir = resolve(import.meta.dirname, "../../demo")
const demoDecks = readDemoDecks(demoDir)

const week = demoDecks.find((entry) => entry.id === "2026-01-05")!.deck
const harbor = demoDecks.find((entry) => entry.id === "harbor-forecast")!.deck

// Record 讓新增 layout 時型別檢查強制把它加進示範涵蓋
const EVERY_LAYOUT: Record<SlideLayout, true> = {
  cover: true,
  overview: true,
  "evidence-decision": true,
  "side-by-side": true,
  "trend-target": true,
  "two-column": true,
  "full-width-panel": true,
  html: true,
  "next-actions": true,
  closing: true,
}
const ALL_LAYOUTS = Object.keys(EVERY_LAYOUT).sort()

const CJK = /[一-鿿]/u
const LATIN = /[A-Za-z]/

function measuredValues(page: TrendTargetPage): number[] {
  return page.observations.flatMap((entry) =>
    entry.state === "measured" ? [entry.value] : []
  )
}

describe("Demo Deck Set", () => {
  it("ships exactly one Deck per Deck Theme", () => {
    const themes = demoDecks.map((entry) => entry.deck.theme ?? "default")

    expect(themes.sort()).toEqual([...DECK_THEMES].sort())
  })

  it("shows every layout in every Deck", () => {
    for (const { id, deck } of demoDecks) {
      const layouts = [...new Set(deck.pages.map((page) => page.layout))]
      expect({ id, layouts: layouts.sort() }).toEqual({
        id,
        layouts: ALL_LAYOUTS,
      })
    }
  })

  it("shows every addable panel kind at least once across the set", () => {
    const kinds = demoDecks.flatMap(({ deck }) =>
      deck.pages.flatMap((page) =>
        isTwoColumnPage(page) || isFullWidthPanelPage(page)
          ? [page.panel.kind]
          : []
      )
    )

    expect([...new Set(kinds)].sort()).toEqual([...ADDABLE_PANEL_KINDS].sort())
  })

  it("saves every Deck without reordering any field", () => {
    for (const { raw, deck } of demoDecks) {
      const saved = JSON.parse(serializeDeck(deck))

      expect(JSON.stringify(saved)).toBe(JSON.stringify(raw))
    }
  })

  it("ships every page export-eligible once it fits", () => {
    for (const { deck } of demoDecks) {
      for (const page of deck.pages) {
        expect(assessExportEligibility(page, { status: "fit" })).toEqual({
          eligible: true,
          issues: [],
        })
      }
    }
  })

  // 公開 demo 的文案統一為英文（3dd5336）；中英混排的版面覆蓋由 e2e fixture 負責
  it("ships English-only copy so the public demo reads consistently", () => {
    for (const { deck } of demoDecks) {
      expect(JSON.stringify(deck)).not.toMatch(CJK)
    }
  })

  it("ships the HTML file every HTML Page references", () => {
    for (const { id, deck } of demoDecks) {
      for (const page of deck.pages.filter(isHtmlPage)) {
        const htmlPath = resolve(demoDir, id, page.htmlFile)

        expect(existsSync(htmlPath)).toBe(true)
        expect(readFileSync(htmlPath, "utf8").trim().length).toBeGreaterThan(0)
      }
    }
  })

  describe("Weekly Series seed", () => {
    it("keeps the Monday-to-Friday Deck Period and the default theme", () => {
      expect(week.theme).toBeUndefined()
      expect(week.period).toEqual({ start: "2026-01-05", end: "2026-01-09" })
    })

    it("opens on a Cover and ends on a Closing", () => {
      expect(week.pages.at(0)?.layout).toBe("cover")
      expect(week.pages.at(-1)?.layout).toBe("closing")
    })
  })

  describe("Trend & Target examples", () => {
    it("ends the at-most example just above its target", () => {
      const lower = week.pages
        .filter(isTrendTargetPage)
        .find((page) => page.direction === "at-most")

      expect(lower?.observations.at(-1)).toEqual({
        state: "measured",
        value: 8.04,
      })
    })

    it("includes negative and zero values in the at-least example", () => {
      const upper = week.pages
        .filter(isTrendTargetPage)
        .find((page) => page.direction === "at-least")!

      expect(measuredValues(upper).some((value) => value < 0)).toBe(true)
      expect(measuredValues(upper)).toContain(0)
    })

    it("ends one example with a Missing week after two measurements", () => {
      const endsMissing = week.pages
        .filter(isTrendTargetPage)
        .find((page) => page.observations.at(-1)?.state === "missing")!

      expect(measuredValues(endsMissing).length).toBeGreaterThanOrEqual(2)
      expect(endsMissing.title).toMatch(LATIN)
    })
  })

  describe("Next Actions examples", () => {
    const longestOutcome = (page: NextActionsPage) =>
      Math.max(...page.commitments.map((item) => item.outcome.length))

    it("shows both the Columns and the Rows composition", () => {
      const variants = week.pages
        .filter(isNextActionsPage)
        .map((page) => page.variant)

      expect(variants.sort()).toEqual(["columns", "rows"])
    })

    it("includes longer Rows than the Columns example", () => {
      const pages = week.pages.filter(isNextActionsPage)
      const columns = pages.find((page) => page.variant !== "rows")!
      const rows = pages.find((page) => page.variant === "rows")!

      expect(longestOutcome(rows)).toBeGreaterThan(longestOutcome(columns))
    })
  })

  describe("Observatory pilot review", () => {
    it("keeps the Harbor Deck Title and theme", () => {
      expect(harbor.theme).toBe("observatory")
      expect(harbor.title).toBe("Harbor Forecast · Pilot review")
    })

    it("ends its Trend on the Deck Period's Monday, still above the target", () => {
      const [trend] = harbor.pages.filter(isTrendTargetPage)

      expect(trendEndDate(trend)).toBe(harbor.period?.start)
      expect(trend.direction).toBe("at-most")
      expect(trend.observations.at(-1)).toMatchObject({ state: "measured" })
      expect(measuredValues(trend).at(-1)!).toBeGreaterThan(trend.target!)
    })
  })
})
