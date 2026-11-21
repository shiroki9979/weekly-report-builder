import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { createDeckFromTemplate } from "@/lib/deck-template"
import {
  ADDABLE_LAYOUTS,
  createBlankAddablePage,
  createBlankClosingPage,
  createBlankEvidenceDecisionPage,
  createBlankFullWidthPanelPage,
  createBlankNextActionsPage,
  createBlankOverviewPage,
  createBlankSideBySidePage,
  createBlankTrendTargetPage,
  createBlankTwoColumnPage,
} from "@/lib/page-lifecycle"
import {
  isEditorialFramePage,
  parseDeck,
  type Deck,
  type EditorialFramePage,
} from "@/lib/deck"

type EditorialFrameLayout = EditorialFramePage["layout"]

// 以版型為 key 的對照表：新增 Editorial Frame 版型而沒補 fixture 時，型別檢查會失敗
const EDITORIAL_FRAME_FIXTURES: {
  [L in EditorialFrameLayout]: Extract<EditorialFramePage, { layout: L }>
} = {
  "two-column": createBlankTwoColumnPage("p01", "table"),
  overview: createBlankOverviewPage("p01"),
  "evidence-decision": createBlankEvidenceDecisionPage("p01"),
  "next-actions": createBlankNextActionsPage("p01"),
  "trend-target": createBlankTrendTargetPage("p01"),
  closing: createBlankClosingPage("p01"),
  "side-by-side": createBlankSideBySidePage("p01"),
  "full-width-panel": createBlankFullWidthPanelPage("p01", "chart"),
}

const editorialFrameCases = Object.entries(EDITORIAL_FRAME_FIXTURES)

const fixturePath = resolve(
  import.meta.dirname,
  "../fixtures/clone-previous-week.json"
)

function loadFixtureDeck() {
  return parseDeck(JSON.parse(readFileSync(fixturePath, "utf-8")))
}

const template = parseDeck({
  showPageNumbers: false,
  pages: [
    {
      id: "p01",
      layout: "next-actions",
      variant: "rows",
      title: "Roadmap",
      notes: "Say this aloud",
      hidden: true,
      commitments: [
        { title: "Ship", outcome: "Live", checkpoint: "Q4" },
        { title: "Measure", outcome: "Baseline", checkpoint: "Q1" },
      ],
    },
    {
      id: "p02",
      layout: "html",
      title: "Custom",
      htmlFile: "p02.html",
      showPageNumber: true,
    },
  ],
})

describe("createDeckFromTemplate", () => {
  it("keeps Deck Theme and Deck Title while clearing page copy", () => {
    const deck = createDeckFromTemplate({
      ...template,
      theme: "observatory",
      title: "Harbor Forecast",
    })
    expect(deck).toMatchObject({
      theme: "observatory",
      title: "Harbor Forecast",
    })
    expect(deck.pages[0].title).toBe("")
  })

  it("keeps structure and clears authored copy without needing a period", () => {
    const deck = createDeckFromTemplate(template)

    expect(deck).not.toHaveProperty("period")
    expect(deck.pages.map((page) => [page.id, page.layout])).toEqual([
      ["p01", "next-actions"],
      ["p02", "html"],
    ])
    expect(deck.pages.every((page) => page.title === "")).toBe(true)
    expect(deck.pages[0]).toMatchObject({
      variant: "rows",
      hidden: true,
      notes: undefined,
      commitments: [
        { title: "", outcome: "", checkpoint: "" },
        { title: "", outcome: "", checkpoint: "" },
      ],
    })
    expect(deck.pages[1]).toMatchObject({
      htmlFile: "p02.html",
      showPageNumber: true,
    })
  })

  it("resets the deck page-number default and applies a requested period", () => {
    const deck = createDeckFromTemplate(template, {
      period: { start: "2026-10-01", end: "2026-12-31" },
    })

    expect(deck.showPageNumbers).toBeUndefined()
    expect(deck.period).toEqual({ start: "2026-10-01", end: "2026-12-31" })
  })

  it("does not mutate the template", () => {
    const before = structuredClone(template)
    createDeckFromTemplate(template)
    expect(template).toEqual(before)
  })

  it("keeps the fixture's structure with cleared copy", () => {
    const previous = loadFixtureDeck()
    const cloned = createDeckFromTemplate(previous)

    expect(cloned.pages).toHaveLength(previous.pages.length)

    expect(cloned.pages.map((page) => page.id)).toEqual(
      previous.pages.map((page) => page.id)
    )
    expect(cloned.pages.map((page) => page.panel.kind)).toEqual(
      previous.pages.map((page) => page.panel.kind)
    )
    expect(cloned.pages.map((page) => page.hidden)).toEqual(
      previous.pages.map((page) => page.hidden)
    )

    for (const page of cloned.pages) {
      expect(page.title).toBe("")
      expect(page.notes).toBeUndefined()
      expect(page.items).toHaveLength(3)
      for (const item of page.items) {
        expect(item.heading).toBe("")
        expect(item.body).toBe("")
      }
    }

    const chartPanel = cloned.pages[0].panel
    if (chartPanel.kind !== "chart") {
      throw new Error("expected chart panel")
    }
    expect(chartPanel.title).toBe("")
    expect(chartPanel.categories).toEqual(["", "", ""])
    expect(chartPanel.series).toHaveLength(2)
    expect(chartPanel.series[0].name).toBe("")
    expect(chartPanel.series[0].values).toEqual([0, 0, 0])

    const flowPanel = cloned.pages[1].panel
    if (flowPanel.kind !== "flow") {
      throw new Error("expected flow panel")
    }
    expect(flowPanel.steps).toHaveLength(2)
    expect(flowPanel.steps[0]).toEqual({
      label: "",
      caption: undefined,
      variant: "default",
    })

    const checklistPanel = cloned.pages[2].panel
    if (checklistPanel.kind !== "checklist") {
      throw new Error("expected checklist panel")
    }
    expect(checklistPanel.items).toEqual([
      { label: "", checked: undefined },
      { label: "", checked: undefined },
    ])

    const tablePanel = cloned.pages[3].panel
    if (tablePanel.kind !== "table") {
      throw new Error("expected table panel")
    }
    expect(tablePanel.columns).toEqual(["", "", ""])
    expect(tablePanel.rows).toEqual([
      { cells: ["", "", ""], emphasis: [1] },
      { cells: ["", "", ""], emphasis: [1] },
    ])

    expect(() => parseDeck(cloned)).not.toThrow()
  })

  it("clears an HTML Page's title and notes while preserving htmlFile", () => {
    const previous = parseDeck({
      period: { start: "2026-08-24", end: "2026-08-28" },
      pages: [
        {
          id: "p03",
          layout: "html",
          title: "Previous Title",
          htmlFile: "p03.html",
          hidden: true,
          notes: "Previous notes",
        },
      ],
    })

    const cloned = createDeckFromTemplate(previous)
    expect(cloned.pages).toHaveLength(1)
    const page = cloned.pages[0]
    expect(page.id).toBe("p03")
    expect(page.layout).toBe("html")
    expect(page.title).toBe("")
    expect(page.hidden).toBe(true)
    expect(page.notes).toBeUndefined()
    if (page.layout !== "html") {
      throw new Error("expected html page")
    }
    expect(page.htmlFile).toBe("p03.html")
    // @ts-expect-error HTML 頁面不應具有 items
    expect(page.items).toBeUndefined()
    // @ts-expect-error HTML 頁面不應具有 panel
    expect(page.panel).toBeUndefined()

    expect(() => parseDeck(cloned)).not.toThrow()
  })

  it("clears overview copy while keeping workstreams and collection length", () => {
    const previous = parseDeck({
      period: { start: "2026-08-24", end: "2026-08-28" },
      pages: [
        {
          id: "p01",
          layout: "overview",
          title: "Delivery recovered",
          notes: "Speaker notes",
          lead: {
            workstream: "Delivery",
            figure: "5 days",
            result: "Turnaround fell",
            impact: "Same week",
            status: { label: "On track", tone: "positive" },
          },
          supporting: [
            {
              workstream: "Accuracy",
              figure: "1.2%",
              result: "Faults dropped",
              impact: "Fewer late fixes",
              status: { label: "Improved", tone: "caution" },
            },
            {
              workstream: "Stability",
              figure: "18%",
              result: "Reserve slowed",
              impact: "Room remains",
              status: { label: "Watch", tone: "caution" },
            },
          ],
        },
      ],
    })

    const cloned = createDeckFromTemplate(previous)
    const page = cloned.pages[0]
    if (page.layout !== "overview") {
      throw new Error("expected overview")
    }

    expect(page).toEqual({
      id: "p01",
      layout: "overview",
      title: "",
      lead: {
        workstream: "Delivery",
        figure: "",
        result: "",
        impact: "",
        status: { label: "", tone: "neutral" },
      },
      supporting: [
        {
          workstream: "Accuracy",
          figure: "",
          result: "",
          impact: "",
          status: { label: "", tone: "neutral" },
        },
        {
          workstream: "Stability",
          figure: "",
          result: "",
          impact: "",
          status: { label: "", tone: "neutral" },
        },
      ],
    })
    expect(() => parseDeck(cloned)).not.toThrow()
  })

  it("clears a two-column Boundary Note and page-number override", () => {
    const previous = parseDeck({
      pages: [
        {
          id: "p01",
          layout: "two-column",
          title: "Eval Gate",
          boundary: "Fictional sample only",
          showPageNumber: false,
          items: [
            { heading: "A", body: "1" },
            { heading: "B", body: "2" },
            { heading: "C", body: "3" },
          ],
          panel: {
            kind: "table",
            title: "Grid",
            columns: ["A"],
            rows: [{ cells: ["1"] }],
          },
        },
      ],
    })

    const cloned = createDeckFromTemplate(previous)

    expect(cloned.pages[0]).toMatchObject({ layout: "two-column", title: "" })
    expect(cloned.pages[0].boundary).toBeUndefined()
    expect(cloned.pages[0].showPageNumber).toBeUndefined()
  })

  // tests/ 不在 npm run typecheck 範圍內，對照表的型別涵蓋只在編輯器生效；以新增選單的版型清單在執行期補上同樣的保證
  it("covers every Editorial Frame layout an author can add", () => {
    const addableEditorialLayouts = ADDABLE_LAYOUTS.filter((layout) =>
      isEditorialFramePage(createBlankAddablePage("p01", layout, "table"))
    )

    expect(Object.keys(EDITORIAL_FRAME_FIXTURES).sort()).toEqual(
      [...addableEditorialLayouts].sort()
    )
  })

  it.each(editorialFrameCases)(
    "clears the %s Editorial Frame chrome a template must not carry over",
    (layout, blankPage) => {
      const previous: Deck = {
        showPageNumbers: false,
        pages: [
          {
            ...blankPage,
            boundary: "Fictional sample only",
            notes: "Say this aloud",
            showPageNumber: true,
          },
        ],
      }

      const [page] = createDeckFromTemplate(previous).pages
      if (!isEditorialFramePage(page)) {
        throw new Error(`expected an Editorial Frame page, got ${page.layout}`)
      }

      expect(page.layout).toBe(layout)
      expect(page.boundary).toBeUndefined()
      expect(page.notes).toBeUndefined()
      expect(page.showPageNumber).toBeUndefined()
    }
  )

  it("resets Editorial page numbers to the deck default", () => {
    const previous: Deck = {
      period: { start: "2026-08-24", end: "2026-08-28" },
      showPageNumbers: false,
      pages: [{ ...createBlankNextActionsPage("p01"), showPageNumber: true }],
    }

    const cloned = createDeckFromTemplate(previous)

    expect(cloned.showPageNumbers).toBeUndefined()
    expect(cloned.pages[0].showPageNumber).toBeUndefined()
  })

  it("keeps an HTML Page's page-number choice because HTML Pages opt in per page", () => {
    const previous = parseDeck({
      period: { start: "2026-08-24", end: "2026-08-28" },
      pages: [
        {
          id: "p01",
          layout: "html",
          title: "Opted in",
          htmlFile: "p01.html",
          showPageNumber: true,
        },
        {
          id: "p02",
          layout: "html",
          title: "Opted out",
          htmlFile: "p02.html",
          showPageNumber: false,
        },
      ],
    })

    const cloned = createDeckFromTemplate(previous)

    expect(cloned.pages[0].showPageNumber).toBe(true)
    expect(cloned.pages[1].showPageNumber).toBe(false)
  })
})
