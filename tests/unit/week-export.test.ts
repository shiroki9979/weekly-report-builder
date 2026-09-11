import { describe, expect, it, vi } from "vitest"

import { metricBufferKey } from "@/lib/evidence-decision-editor"
import {
  createBlankEvidenceDecisionPage,
  createBlankTwoColumnPage,
} from "@/lib/page-lifecycle"
import {
  parseWeekDocument,
  type EvidenceDecisionPage,
  type WeekDocument,
} from "@/lib/week-document"
import {
  exportFileName,
  exportVisiblePages,
  formatSkippedExportWarning,
  listExportablePages,
  listSkippedPages,
} from "@/lib/week-export"

const completePage = {
  id: "p01",
  layout: "two-column" as const,
  title: "Overview",
  items: [
    { heading: "One", body: "First" },
    { heading: "Two", body: "Second" },
    { heading: "Three", body: "Third" },
  ],
  panel: {
    kind: "chart" as const,
    title: "Commits",
    categories: ["24"],
    series: [{ name: "Platform", values: [1] }],
  },
}

const sampleWeek: WeekDocument = {
  start: "2026-08-24",
  end: "2026-08-28",
  pages: [
    completePage,
    {
      ...completePage,
      id: "p02",
      title: "Hidden page",
      hidden: true,
      panel: {
        kind: "flow",
        title: "Flow",
        steps: [{ label: "Step" }],
      },
    },
    {
      ...completePage,
      id: "p04",
      title: "Eval Gate",
      panel: {
        kind: "table",
        title: "Loaded model",
        columns: ["Action", "Outcome"],
        rows: [{ cells: ["Eval", "Skip"] }],
      },
    },
  ],
}

const fitMeasure = vi.fn(async () => ({ status: "fit" as const }))

describe("week-export", () => {
  it("skips hidden pages when listing exportable pages", () => {
    expect(listExportablePages(sampleWeek).map((page) => page.id)).toEqual([
      "p01",
      "p04",
    ])
  })

  it("builds the agreed PNG filename", () => {
    expect(exportFileName("2026-08-24", "p02")).toBe("2026-08-24-p02.png")
  })

  it("downloads one PNG per eligible page with the agreed filename", async () => {
    const downloads: string[] = []
    const renderedPages: string[] = []

    const skipped = await exportVisiblePages("2026-08-24", sampleWeek, {
      renderPage: async (page) => {
        renderedPages.push(page.id)
        return document.createElement("div")
      },
      capture: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
      download: (_blob, fileName) => {
        downloads.push(fileName)
      },
      measureCapture: fitMeasure,
    })

    expect(renderedPages).toEqual(["p01", "p04"])
    expect(downloads).toEqual(["2026-08-24-p01.png", "2026-08-24-p04.png"])
    expect(skipped).toEqual([])
  })

  it("handles html layout pages properly in exportable list", () => {
    const weekWithHtml: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          ...completePage,
          panel: { kind: "checklist", title: "List", items: [{ label: "x" }] },
        },
        {
          id: "p02",
          layout: "html",
          title: "Visible HTML",
          htmlFile: "p02.html",
        },
        {
          id: "p03",
          layout: "html",
          title: "Hidden HTML",
          htmlFile: "p03.html",
          hidden: true,
        },
      ],
    }

    expect(listExportablePages(weekWithHtml).map((page) => page.id)).toEqual([
      "p01",
      "p02",
    ])
  })

  it("skips unknown layouts from batch export", () => {
    const week = parseWeekDocument({
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          id: "p01",
          layout: "future-layout",
          title: "Not yet supported",
        },
      ],
    })

    expect(listExportablePages(week)).toEqual([])
    expect(listSkippedPages(week).map((page) => page.id)).toEqual(["p01"])
  })

  it("skips draft and overflowing pages with page id and reason, then continues", async () => {
    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        createBlankTwoColumnPage("p01", "table"),
        { ...completePage, id: "p02" },
        {
          ...completePage,
          id: "p03",
          title: "Overflowing",
        },
      ],
    }

    const downloads: string[] = []
    const skipped = await exportVisiblePages("2026-08-24", week, {
      renderPage: async (page) => {
        const element = document.createElement("div")
        element.dataset.pageId = page.id
        return element
      },
      capture: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
      download: (_blob, fileName) => {
        downloads.push(fileName)
      },
      measureCapture: async (element) => {
        if (element.dataset.pageId === "p03") {
          return { status: "overflow", axes: ["vertical"] }
        }
        return { status: "fit" }
      },
    })

    expect(downloads).toEqual(["2026-08-24-p02.png"])
    expect(skipped.map((entry) => entry.pageId)).toEqual(["p01", "p03"])
    expect(skipped[0]?.issues[0]?.code).toBe("missing-content")
    expect(skipped[1]?.issues[0]?.code).toBe("overflow")
  })

  it("does not render a draft page for capture measurement", async () => {
    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [createBlankTwoColumnPage("p01", "checklist")],
    }
    const renderPage = vi.fn(async () => document.createElement("div"))

    await exportVisiblePages("2026-08-24", week, {
      renderPage,
      capture: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
      download: vi.fn(),
      measureCapture: fitMeasure,
    })

    expect(renderPage).not.toHaveBeenCalled()
  })

  it("skips an evidence-decision page with invalid metric drafts and continues", async () => {
    const decisionPage: EvidenceDecisionPage = {
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
    }
    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [decisionPage, { ...completePage, id: "p02" }],
    }
    const downloads: string[] = []
    const skipped = await exportVisiblePages("2026-08-24", week, {
      renderPage: async () => document.createElement("div"),
      capture: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
      download: (_blob, fileName) => {
        downloads.push(fileName)
      },
      measureCapture: fitMeasure,
      metricBuffer: {
        [metricBufferKey("p01", "metrics[0].baselineValue")]: "abc",
      },
    })

    expect(downloads).toEqual(["2026-08-24-p02.png"])
    expect(skipped).toEqual([
      {
        pageId: "p01",
        issues: [
          {
            code: "invalid-content",
            path: "metrics[0].baselineValue",
            message: "Metric value must be a finite non-negative number",
          },
        ],
      },
    ])
  })

  it("merges missing content with invalid metric drafts in one skip reason", async () => {
    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        createBlankEvidenceDecisionPage("p01"),
        { ...completePage, id: "p02" },
      ],
    }
    const renderPage = vi.fn(async () => document.createElement("div"))
    const skipped = await exportVisiblePages("2026-08-24", week, {
      renderPage,
      capture: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
      download: vi.fn(),
      measureCapture: fitMeasure,
      metricBuffer: {
        [metricBufferKey("p01", "metrics[0].baselineValue")]: "abc",
      },
    })

    expect(renderPage.mock.calls.map((call) => call[0].id)).toEqual(["p02"])
    expect(skipped[0]?.issues.map((issue) => [issue.path, issue.code])).toEqual(
      [
        ["title", "missing-content"],
        ["verdict", "missing-content"],
        ["metrics[0].label", "missing-content"],
        ["metrics[0].baselineValue", "invalid-content"],
        ["metrics[0].candidateValue", "missing-content"],
        ["metrics[1].label", "missing-content"],
        ["metrics[1].baselineValue", "missing-content"],
        ["metrics[1].candidateValue", "missing-content"],
        ["interpretations[0]", "missing-content"],
        ["interpretations[1]", "missing-content"],
      ]
    )
  })

  it("names Draft Page and Overflowing Page in skip warnings", () => {
    expect(
      formatSkippedExportWarning([
        {
          pageId: "p01",
          issues: [
            {
              code: "missing-content",
              path: "title",
              message: "Title is required",
            },
          ],
        },
        {
          pageId: "p02",
          issues: [{ code: "overflow", message: "Page overflows" }],
        },
        {
          pageId: "p03",
          issues: [
            {
              code: "invalid-content",
              path: "metrics[0].baselineValue",
              message: "Metric value must be a finite non-negative number",
            },
          ],
        },
      ])
    ).toBe(
      "Skipped pages: p01: title (Draft Page); p02: Overflowing Page; p03: metrics[0].baselineValue (invalid content)"
    )
  })
})
