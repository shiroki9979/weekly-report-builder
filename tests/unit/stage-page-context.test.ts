import { describe, expect, it } from "vitest"

import { createStagePageContext } from "@/lib/stage-page-context"
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
  it("builds the frame label from the deck period", () => {
    expect(
      createStagePageContext("2026-08-24", weekDocument(), "p01").frameLabel
    ).toBe("2026-08-24 — 2026-08-28")
  })

  it("leaves the frame label empty for a deck without a period", () => {
    const deck = { ...weekDocument(), period: undefined }

    expect(createStagePageContext("q4-roadmap", deck, "p01")).toMatchObject({
      documentId: "q4-roadmap",
      frameLabel: "",
    })
  })

  it("numbers supported non-hidden pages and ignores draft or overflowing content", () => {
    const week = weekDocument()

    expect(createStagePageContext("2026-08-24", week, "p01").pageLabel).toBe(
      "1 / 2"
    )
    expect(createStagePageContext("2026-08-24", week, "p03").pageLabel).toBe(
      "2 / 2"
    )
  })

  it("labels hidden pages without giving them a page position", () => {
    expect(
      createStagePageContext("2026-08-24", weekDocument(), "p02").pageLabel
    ).toBe("Hidden")
  })

  it("does not assign a page position to unsupported layouts", () => {
    const week = weekDocument()

    expect(createStagePageContext("2026-08-24", week, "p04").pageLabel).toBe("")
    expect(createStagePageContext("2026-08-24", week, "p05").pageLabel).toBe("")
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

    expect(createStagePageContext("2026-08-24", week, "p01").pageLabel).toBe(
      "1 / 2"
    )
    expect(createStagePageContext("2026-08-24", week, "p02").pageLabel).toBe(
      "2 / 2"
    )
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

    expect(createStagePageContext("2026-08-24", week, "p01").pageLabel).toBe(
      "1 / 3"
    )
    expect(createStagePageContext("2026-08-24", week, "p02").pageLabel).toBe(
      "2 / 3"
    )
    expect(createStagePageContext("2026-08-24", week, "p03").pageLabel).toBe(
      "3 / 3"
    )
  })

  it("lets an HTML Page opt in to a page number when the week hides them", () => {
    const week = parseDeck({
      period: { start: "2026-08-24", end: "2026-08-28" },
      showPageNumbers: false,
      pages: [
        {
          id: "p01",
          layout: "html",
          title: "No override",
          htmlFile: "p01.html",
        },
        {
          id: "p02",
          layout: "html",
          title: "Override show",
          htmlFile: "p02.html",
          showPageNumber: true,
        },
      ],
    })

    expect(
      createStagePageContext("2026-08-24", week, "p01").showPageNumber
    ).toBe(false)
    expect(
      createStagePageContext("2026-08-24", week, "p02").showPageNumber
    ).toBe(true)
  })

  it("does not overlay a page number on an HTML Page without an override, even when the week shows them", () => {
    const week = parseDeck({
      period: { start: "2026-08-24", end: "2026-08-28" },
      showPageNumbers: true,
      pages: [
        {
          id: "p01",
          layout: "html",
          title: "No override",
          htmlFile: "p01.html",
        },
        {
          id: "p02",
          layout: "html",
          title: "Override hide",
          htmlFile: "p02.html",
          showPageNumber: false,
        },
      ],
    })

    expect(
      createStagePageContext("2026-08-24", week, "p01").showPageNumber
    ).toBe(false)
    expect(
      createStagePageContext("2026-08-24", week, "p02").showPageNumber
    ).toBe(false)
  })

  it("does not show a page number on a hidden page or a two-column page", () => {
    const week = parseDeck({
      period: { start: "2026-08-24", end: "2026-08-28" },
      pages: [
        {
          id: "p01",
          layout: "html",
          title: "Hidden override",
          htmlFile: "p01.html",
          hidden: true,
          showPageNumber: true,
        },
        {
          id: "p02",
          layout: "two-column",
          title: "Two column",
          showPageNumber: true,
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

    expect(createStagePageContext("2026-08-24", week, "p01")).toMatchObject({
      pageLabel: "Hidden",
      showPageNumber: false,
    })
    expect(
      createStagePageContext("2026-08-24", week, "p02").showPageNumber
    ).toBe(false)
  })
})
