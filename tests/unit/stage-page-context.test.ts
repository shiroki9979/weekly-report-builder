import { describe, expect, it } from "vitest"

import {
  createStagePageContext,
  getPagePosition,
  padPageNumber,
} from "@/lib/stage-page-context"
import { parseDeck } from "@/lib/deck"

function weekDocument() {
  return parseDeck({
    period: { start: "2026-08-24", end: "2026-08-28" },
    pages: [
      {
        id: "p01",
        layout: "two-column",
        title: "Visible table",
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
      {
        id: "p02",
        layout: "two-column",
        title: "Hidden chart",
        hidden: true,
        items: [
          { heading: "A", body: "1" },
          { heading: "B", body: "2" },
          { heading: "C", body: "3" },
        ],
        panel: {
          kind: "chart",
          title: "Commits",
          categories: [""],
          series: [{ name: "", values: [0] }],
        },
      },
      {
        id: "p03",
        layout: "html",
        title: "Diagram",
        htmlFile: "p03.html",
      },
      {
        id: "p04",
        layout: "future-layout",
        title: "Unknown",
      },
      {
        id: "p05",
        layout: "two-column",
        title: "Fields",
        items: [
          { heading: "A", body: "1" },
          { heading: "B", body: "2" },
          { heading: "C", body: "3" },
        ],
        panel: { kind: "fields", title: "Meta", rows: [] },
      },
    ],
  })
}

describe("createStagePageContext", () => {
  it("carries effective theme and Deck Title as facts without changing persisted defaults", () => {
    const deck = weekDocument()
    expect(createStagePageContext("harbor", deck, "p01")).toMatchObject({
      theme: "default",
    })
    expect(deck).not.toHaveProperty("theme")
    expect(
      createStagePageContext(
        "harbor",
        { ...deck, theme: "observatory", title: "Harbor Forecast" },
        "p01"
      )
    ).toMatchObject({
      theme: "observatory",
      footer: { deckTitle: "Harbor Forecast" },
    })
  })

  it("builds the frame label from the deck period", () => {
    expect(
      createStagePageContext("2026-08-24", weekDocument(), "p01").frameLabel
    ).toBe("2026-08-24 — 2026-08-28")
  })

  it("leaves the frame label empty for a deck without a period", () => {
    const deck = { ...weekDocument(), period: undefined }

    expect(createStagePageContext("q4-roadmap", deck, "p01")).toMatchObject({
      documentId: "q4-roadmap",
      frameLabel: null,
    })
  })

  it("marks a Hidden Page", () => {
    const week = weekDocument()

    expect(createStagePageContext("2026-08-24", week, "p01").hidden).toBe(false)
    expect(createStagePageContext("2026-08-24", week, "p02").hidden).toBe(true)
  })
})

describe("getPagePosition", () => {
  it("numbers supported non-hidden pages and ignores draft or overflowing content", () => {
    const week = weekDocument()

    expect(getPagePosition(week.pages, "p01")).toEqual({ index: 1, total: 2 })
    expect(getPagePosition(week.pages, "p03")).toEqual({ index: 2, total: 2 })
  })

  it("gives a hidden page no page position", () => {
    expect(getPagePosition(weekDocument().pages, "p02")).toBeNull()
  })

  it("does not assign a page position to unsupported layouts", () => {
    const week = weekDocument()

    expect(getPagePosition(week.pages, "p04")).toBeNull()
    expect(getPagePosition(week.pages, "p05")).toBeNull()
  })

  it("counts overview pages among supported page positions", () => {
    const blankOutcome = {
      workstream: "",
      figure: "",
      result: "",
      impact: "",
      status: { label: "", tone: "neutral" },
    }
    const week = parseDeck({
      period: { start: "2026-08-24", end: "2026-08-28" },
      pages: [
        {
          id: "p01",
          layout: "overview",
          title: "Overview",
          lead: blankOutcome,
          supporting: [blankOutcome],
        },
        {
          id: "p02",
          layout: "html",
          title: "Diagram",
          htmlFile: "p02.html",
        },
      ],
    })

    expect(getPagePosition(week.pages, "p01")).toEqual({
      index: 1,
      total: 2,
    })
    expect(getPagePosition(week.pages, "p02")).toEqual({
      index: 2,
      total: 2,
    })
  })

  it("counts evidence-decision and next-actions pages among supported page positions", () => {
    const week = parseDeck({
      period: { start: "2026-08-24", end: "2026-08-28" },
      pages: [
        {
          id: "p01",
          layout: "evidence-decision",
          title: "Ship the candidate.",
          verdict: "Adopt the candidate.",
          metrics: [
            {
              label: "Turnaround",
              baselineValue: 9.4,
              candidateValue: 5.1,
              unit: "days",
              unitPosition: "after",
              unitSpacing: "space",
              precision: 1,
            },
          ],
          interpretations: ["The candidate finishes the same week."],
        },
        {
          id: "p02",
          layout: "next-actions",
          title: "Five-day reviews.",
          commitments: [
            {
              title: "Stabilize the review queue",
              outcome: "Changes land within five days.",
              checkpoint: "Median wait ≤ 5 days next Friday.",
            },
            {
              title: "Hold the reserve",
              outcome: "Use stays below 25%.",
              checkpoint: "Reserve report signed before the next release.",
            },
          ],
        },
        {
          id: "p03",
          layout: "html",
          title: "Diagram",
          htmlFile: "p03.html",
        },
      ],
    })

    expect(getPagePosition(week.pages, "p01")).toEqual({
      index: 1,
      total: 3,
    })
    expect(getPagePosition(week.pages, "p02")).toEqual({
      index: 2,
      total: 3,
    })
    expect(getPagePosition(week.pages, "p03")).toEqual({
      index: 3,
      total: 3,
    })
  })
})

describe("createStagePageContext footer", () => {
  const framed = (id: string, extra: object = {}) => ({
    id,
    layout: "two-column",
    title: "Framed",
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
    ...extra,
  })
  const html = (id: string, extra: object = {}) => ({
    id,
    layout: "html",
    title: "Fragment",
    htmlFile: `${id}.html`,
    ...extra,
  })
  const cover = (id: string, extra: object = {}) => ({
    id,
    layout: "cover",
    title: "Harbor",
    ...extra,
  })
  // 可見且受支援的頁依序為 cover、framed、framed-off、html、html-on、html-off，共 6 頁
  const pages = [
    cover("cover", { showPageNumber: true }),
    framed("framed"),
    framed("framed-off", { showPageNumber: false }),
    framed("framed-hidden", { hidden: true }),
    html("html"),
    html("html-on", { showPageNumber: true }),
    html("html-hidden", { hidden: true, showPageNumber: true }),
    cover("cover-hidden", { hidden: true }),
    { id: "unknown", layout: "future-layout", title: "Unknown" },
    html("html-off", { showPageNumber: false }),
  ]
  const footerOf = (deck: unknown, id: string) =>
    createStagePageContext("harbor", parseDeck(deck), id).footer

  it.each([
    ["cover", { deckTitle: "Harbor Forecast", position: null }],
    ["cover-hidden", { deckTitle: "Harbor Forecast", position: null }],
    [
      "framed",
      { deckTitle: "Harbor Forecast", position: { index: 2, total: 6 } },
    ],
    ["framed-off", { deckTitle: "Harbor Forecast", position: null }],
    ["framed-hidden", { deckTitle: "Harbor Forecast", position: null }],
    ["html", null],
    [
      "html-on",
      { deckTitle: "Harbor Forecast", position: { index: 5, total: 6 } },
    ],
    ["html-hidden", null],
    ["html-off", null],
    ["unknown", null],
  ])("resolves the footer of the %s page", (id, footer) => {
    expect(footerOf({ title: "Harbor Forecast", pages }, id)).toEqual(footer)
  })

  it.each([
    ["cover", { position: null }],
    ["framed", { position: { index: 2, total: 6 } }],
    ["framed-off", { position: null }],
    ["html-on", { position: { index: 5, total: 6 } }],
    ["html", null],
  ])(
    "leaves the Deck Title out of the %s footer when the Deck has none",
    (id, footer) => {
      expect(footerOf({ pages }, id)).toEqual(footer)
    }
  )

  it("lets the Deck default hide Editorial Frame page numbers but not an HTML Page footer", () => {
    const deck = {
      title: "Harbor Forecast",
      showPageNumbers: false,
      pages: [
        framed("framed"),
        framed("framed-on", { showPageNumber: true }),
        html("html-on", { showPageNumber: true }),
      ],
    }

    expect(footerOf(deck, "framed")).toEqual({
      deckTitle: "Harbor Forecast",
      position: null,
    })
    expect(footerOf(deck, "framed-on")).toEqual({
      deckTitle: "Harbor Forecast",
      position: { index: 2, total: 3 },
    })
    expect(footerOf(deck, "html-on")).toEqual({
      deckTitle: "Harbor Forecast",
      position: { index: 3, total: 3 },
    })
  })
})

describe("padPageNumber", () => {
  it("pads single-digit Page Position numbers to two digits for theme labels", () => {
    expect(padPageNumber(3)).toBe("03")
    expect(padPageNumber(12)).toBe("12")
    expect(padPageNumber(104)).toBe("104")
  })
})
