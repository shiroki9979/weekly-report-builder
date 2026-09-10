import { describe, expect, it } from "vitest"

import { createStagePageContext } from "@/lib/stage-page-context"
import { parseWeekDocument } from "@/lib/week-document"

function weekDocument() {
  return parseWeekDocument({
    start: "2026-08-24",
    end: "2026-08-28",
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
  it("builds an ISO week label from Monday through Friday", () => {
    expect(createStagePageContext(weekDocument(), "p01").weekLabel).toBe(
      "2026-08-24 — 2026-08-28"
    )
  })

  it("numbers supported non-hidden pages and ignores draft or overflowing content", () => {
    const week = weekDocument()

    expect(createStagePageContext(week, "p01").pageLabel).toBe("1 / 2")
    expect(createStagePageContext(week, "p03").pageLabel).toBe("2 / 2")
  })

  it("labels hidden pages without giving them a page position", () => {
    expect(createStagePageContext(weekDocument(), "p02").pageLabel).toBe(
      "Hidden"
    )
  })

  it("does not assign a page position to unsupported layouts", () => {
    const week = weekDocument()

    expect(createStagePageContext(week, "p04").pageLabel).toBe("")
    expect(createStagePageContext(week, "p05").pageLabel).toBe("")
  })

  it("counts weekly-overview pages among supported page positions", () => {
    const blankOutcome = {
      workstream: "",
      figure: "",
      result: "",
      impact: "",
      status: { label: "", tone: "neutral" },
    }
    const week = parseWeekDocument({
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          id: "p01",
          layout: "weekly-overview",
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

    expect(createStagePageContext(week, "p01").pageLabel).toBe("1 / 2")
    expect(createStagePageContext(week, "p02").pageLabel).toBe("2 / 2")
  })
})
