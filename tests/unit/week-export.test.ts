import { describe, expect, it, vi } from "vitest"

import type { WeekDocument } from "@/lib/week-document"
import {
  exportFileName,
  exportVisiblePages,
  listExportablePages,
} from "@/lib/week-export"

const sampleWeek: WeekDocument = {
  start: "2026-08-24",
  end: "2026-08-28",
  pages: [
    {
      id: "p01",
      layout: "two-column",
      title: "Overview",
      items: [
        { heading: "One", body: "First" },
        { heading: "Two", body: "Second" },
        { heading: "Three", body: "Third" },
      ],
      panel: {
        kind: "chart",
        title: "Commits",
        categories: ["24"],
        series: [{ name: "Platform", values: [1] }],
      },
    },
    {
      id: "p02",
      layout: "two-column",
      title: "Hidden page",
      hidden: true,
      items: [
        { heading: "One", body: "First" },
        { heading: "Two", body: "Second" },
        { heading: "Three", body: "Third" },
      ],
      panel: {
        kind: "flow",
        title: "Flow",
        steps: [{ label: "Step" }],
      },
    },
    {
      id: "p04",
      layout: "two-column",
      title: "Eval Gate",
      items: [
        { heading: "One", body: "First" },
        { heading: "Two", body: "Second" },
        { heading: "Three", body: "Third" },
      ],
      panel: {
        kind: "table",
        title: "Loaded model",
        columns: ["Action", "Outcome"],
        rows: [{ cells: ["Eval", "Skip"] }],
      },
    },
  ],
}

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

  it("downloads one PNG per visible page with the agreed filename", async () => {
    const downloads: string[] = []
    const renderedPages: string[] = []

    await exportVisiblePages("2026-08-24", sampleWeek, {
      renderPage: async (page) => {
        renderedPages.push(page.id)
        return document.createElement("div")
      },
      capture: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
      download: (_blob, fileName) => {
        downloads.push(fileName)
      },
    })

    expect(renderedPages).toEqual(["p01", "p04"])
    expect(downloads).toEqual(["2026-08-24-p01.png", "2026-08-24-p04.png"])
  })

  it("handles html layout pages properly in exportable list", () => {
    const weekWithHtml: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          id: "p01",
          layout: "two-column",
          title: "Page 1",
          items: [
            { heading: "A", body: "1" },
            { heading: "B", body: "2" },
            { heading: "C", body: "3" },
          ],
          panel: { kind: "checklist", title: "List", items: [] },
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

    expect(listExportablePages(weekWithHtml).map((p) => p.id)).toEqual([
      "p01",
      "p02",
    ])
  })
})
