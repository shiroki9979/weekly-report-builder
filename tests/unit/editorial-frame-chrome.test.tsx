import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StageSlide } from "@/components/stage/stage-slide"
import { DECK_THEMES, parseDeck, type EditorialFrameLayout } from "@/lib/deck"
import { createStagePageContext } from "@/lib/stage-page-context"

type ChromeCase = {
  // 版型專屬內容只求能通過 parseDeck；chrome（title、boundary、eyebrow）由測試統一補上
  body: Record<string, unknown>
  // 預期值照 #74 表格寫死，不讀預設詞清單，避免同構斷言
  defaultEyebrow: string
}

// 以 Record 鍵住每個 Editorial Frame 版型：新增版型卻沒補案例時型別檢查會失敗
const CASES: Record<EditorialFrameLayout, ChromeCase> = {
  overview: {
    defaultEyebrow: "Overview",
    body: {
      lead: outcome("Platform"),
      supporting: [outcome("Forecast")],
    },
  },
  "evidence-decision": {
    defaultEyebrow: "Evidence-backed Decision",
    body: {
      verdict: "Keep one checklist",
      metrics: [
        {
          label: "Review wait",
          baselineValue: 1.8,
          candidateValue: 0.5,
          unit: "days",
          unitPosition: "after",
          unitSpacing: "space",
          precision: 1,
        },
      ],
      interpretations: ["One gate, one list"],
    },
  },
  "next-actions": {
    defaultEyebrow: "Next Actions",
    body: {
      variant: "columns",
      commitments: [
        {
          title: "Add a site",
          outcome: "Four sites compare",
          checkpoint: "Before Friday",
        },
        {
          title: "Dry-run the gate",
          outcome: "The checklist is rehearsed",
          checkpoint: "By Thursday",
        },
      ],
    },
  },
  "trend-target": {
    defaultEyebrow: "Trend & Target",
    body: {
      metric: {
        label: "Export duration",
        unit: "s",
        unitPosition: "after",
        unitSpacing: "space",
        precision: 1,
      },
      cadence: "week",
      start: "2025-10-20",
      observations: [
        { state: "measured", value: 9.6 },
        { state: "measured", value: 8.1 },
      ],
      target: 8,
      direction: "at-most",
      interpretation: "Still above the ceiling",
      measurementContext: "Scripted exports",
    },
  },
  "side-by-side": {
    defaultEyebrow: "Comparison",
    body: {
      columns: [
        { label: "Single gate", points: ["One checklist"] },
        { label: "Per-channel notes", points: ["Two documents"] },
      ],
      chosen: 0,
    },
  },
  "full-width-panel": {
    defaultEyebrow: "Panel",
    body: {
      panel: {
        kind: "checklist",
        title: "",
        items: [{ label: "Alias created", checked: true }],
      },
    },
  },
  closing: {
    defaultEyebrow: "Closing",
    body: {
      takeaways: [{ text: "Keep measuring" }],
      closingLine: "Contact the team",
    },
  },
  "two-column": {
    defaultEyebrow: "",
    body: {
      items: [
        { heading: "Platform", body: "One gate" },
        { heading: "Forecast", body: "Three sites" },
        { heading: "Ops", body: "Quiet week" },
      ],
      panel: {
        kind: "table",
        title: "Loaded model",
        columns: ["Action", "State"],
        rows: [{ cells: ["Promote", "Pinned"] }],
      },
    },
  },
}

function outcome(workstream: string) {
  return {
    workstream,
    figure: "1 gate",
    result: `${workstream} result`,
    impact: `${workstream} impact`,
    status: { label: "On track", tone: "positive" },
  }
}

const HEADLINE = "Headline under test"
const BOUNDARY = "Fictional sample only"
const DECK_TITLE = "Harbor Forecast"
const FRAME_LABEL = "2026-08-24 — 2026-08-28"

function renderChrome(
  layout: EditorialFrameLayout,
  options: { theme?: string; chrome?: Record<string, unknown> } = {}
) {
  const deck = parseDeck({
    title: DECK_TITLE,
    period: { start: "2026-08-24", end: "2026-08-28" },
    theme: options.theme ?? "default",
    pages: [
      {
        id: "page",
        layout,
        title: HEADLINE,
        boundary: BOUNDARY,
        ...CASES[layout].body,
        ...options.chrome,
      },
    ],
  })
  const page = deck.pages[0]
  return render(
    <StageSlide
      page={page}
      context={createStagePageContext("2026-08-24", deck, page.id)}
    />
  )
}

// § nn 是 observatory 的外框裝飾，不算 eyebrow 文字；保留行高的不換行空白也不算
function eyebrowRow(container: HTMLElement): HTMLElement {
  const row = container.querySelector<HTMLElement>(".editorial-eyebrow")
  if (!row) throw new Error("expected an eyebrow row")
  return row
}

function eyebrowText(container: HTMLElement): string {
  return Array.from(eyebrowRow(container).childNodes)
    .filter(
      (node) =>
        !(
          node instanceof HTMLElement &&
          node.classList.contains("editorial-page-index")
        )
    )
    .map((node) => node.textContent)
    .join("")
    .trim()
}

const LAYOUTS = Object.keys(CASES) as EditorialFrameLayout[]

describe("Editorial Frame chrome on the Stage", () => {
  describe.each(DECK_THEMES)("in the %s theme", (theme) => {
    it.each(LAYOUTS)(
      "draws %s with its eyebrow, headline, Boundary Note, Frame Label, and footer",
      (layout) => {
        const { container } = renderChrome(layout, { theme })

        expect(eyebrowText(container)).toBe(CASES[layout].defaultEyebrow)
        expect(
          screen.getByRole("heading", { level: 1, name: HEADLINE })
        ).toBeInTheDocument()
        expect(
          container.querySelector(".editorial-boundary")
        ).toHaveTextContent(BOUNDARY)
        expect(container.querySelector(".editorial-period")).toHaveTextContent(
          FRAME_LABEL
        )
        const footer = screen.getByRole("contentinfo")
        expect(footer).toHaveTextContent(DECK_TITLE)
        expect(footer).toHaveTextContent("1 / 1")
      }
    )
  })

  it("keeps a blank eyebrow row above the headline on Two-column", () => {
    const { container } = renderChrome("two-column")

    const row = eyebrowRow(container)
    expect(eyebrowText(container)).toBe("")
    // 不換行空白撐住一行高，headline 才不會因為沒有 eyebrow 而上移
    expect(row.textContent).toContain("\u00a0")
    const header = container.querySelector(".editorial-header")
    expect(header?.querySelector(".editorial-meta")).toContainElement(row)
    expect(header?.lastElementChild).toHaveTextContent(HEADLINE)
  })

  it.each(LAYOUTS)("shows the authored eyebrow on %s", (layout) => {
    const { container } = renderChrome(layout, {
      chrome: { eyebrow: "  Risks  " },
    })

    expect(eyebrowText(container)).toBe("Risks")
  })

  describe.each(["", " \t "])("with the eyebrow %j", (blank) => {
    it.each(LAYOUTS)("falls back to the %s default", (layout) => {
      const { container } = renderChrome(layout, {
        chrome: { eyebrow: blank },
      })

      expect(eyebrowText(container)).toBe(CASES[layout].defaultEyebrow)
    })
  })

  // Closing 在 #74 之前就有自己的 eyebrow 欄位，既有 Deck JSON 不必遷移
  it("shows the eyebrow of a Closing page saved before #74", () => {
    const { container } = renderChrome("closing", {
      chrome: { eyebrow: "Next week" },
    })

    expect(eyebrowText(container)).toBe("Next week")
  })
})
