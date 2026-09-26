import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { parseWeekDocument } from "@/lib/week-document"

const twoColumnFixturePath = resolve(
  import.meta.dirname,
  "../fixtures/two-column-week.json"
)

const interleavedHtmlFixturePath = resolve(
  import.meta.dirname,
  "../fixtures/interleaved-html-week.json"
)

function twoColumnWeekWithPanel(panel: Record<string, unknown>) {
  return {
    start: "2026-08-24",
    end: "2026-08-28",
    pages: [
      {
        id: "p01",
        layout: "two-column",
        title: "Panel",
        items: [
          { heading: "A", body: "1" },
          { heading: "B", body: "2" },
          { heading: "C", body: "3" },
        ],
        panel,
      },
    ],
  }
}

describe("parseWeekDocument", () => {
  it("parses the week fixture with two-column layout and table panel", () => {
    const raw = readFileSync(twoColumnFixturePath, "utf-8")
    const week = parseWeekDocument(JSON.parse(raw))

    expect(week.start).toBe("2026-08-24")
    expect(week.end).toBe("2026-08-28")
    expect(week.pages).toHaveLength(2)

    const page = week.pages[0]
    expect(page.layout).toBe("two-column")
    expect(page.title).toBe("Eval Gate")
    expect(page.items).toHaveLength(3)
    expect(page.items[0].heading).toBe("Metrics follow the task")
    expect(page.panel.kind).toBe("table")

    if (page.panel.kind !== "table") {
      throw new Error("expected table panel")
    }

    expect(page.panel.columns).toEqual(["Action", "Production", "Result"])
    expect(page.panel.rows[0].cells).toEqual([
      "Scheduled eval",
      "Pinned",
      "Skip promote",
    ])

    const htmlPage = week.pages[1]
    expect(htmlPage.layout).toBe("html")
    if (htmlPage.layout !== "html") {
      throw new Error("expected html page")
    }
    expect(htmlPage.htmlFile).toBe("p02.html")
  })

  it("parses interleaved html pages among two-column pages", () => {
    const raw = readFileSync(interleavedHtmlFixturePath, "utf-8")
    const week = parseWeekDocument(JSON.parse(raw))

    expect(week.start).toBe("2026-08-31")
    expect(week.end).toBe("2026-09-04")
    expect(week.pages.map((page) => page.id)).toEqual([
      "p01",
      "p02",
      "p03",
      "p04",
    ])
    expect(week.pages.map((page) => page.layout)).toEqual([
      "two-column",
      "html",
      "two-column",
      "html",
    ])

    const htmlFiles = week.pages
      .filter((page) => page.layout === "html")
      .map((page) => {
        if (page.layout !== "html") {
          throw new Error("expected html page")
        }
        return page.htmlFile
      })
    expect(htmlFiles).toEqual(["p02.html", "p04.html"])
  })

  it("rejects documents without pages", () => {
    expect(() =>
      parseWeekDocument({ start: "2026-08-24", end: "2026-08-28", pages: [] })
    ).toThrow(/pages/i)
  })

  it("parses html layout page without items or panel", () => {
    const doc = parseWeekDocument({
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          id: "p03",
          layout: "html",
          title: "Escape Hatch",
          htmlFile: "p03.html",
          hidden: true,
          notes: "Speaker talking points",
        },
      ],
    })

    expect(doc.pages).toHaveLength(1)
    const page = doc.pages[0]
    expect(page.layout).toBe("html")
    expect(page.id).toBe("p03")
    expect(page.title).toBe("Escape Hatch")
    expect(page.hidden).toBe(true)
    expect(page.notes).toBe("Speaker talking points")
    if (page.layout !== "html") {
      throw new Error("expected html page")
    }
    expect(page.htmlFile).toBe("p03.html")
    // @ts-expect-error HTML 頁面不應具有 items
    expect(page.items).toBeUndefined()
    // @ts-expect-error HTML 頁面不應具有 panel
    expect(page.panel).toBeUndefined()
  })

  it("preserves an unknown layout so the stage can warn and skip it", () => {
    const doc = parseWeekDocument({
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          id: "p04",
          layout: "future-layout",
          title: "Future Slide",
          hidden: true,
          notes: "Not rendered yet",
        },
      ],
    })

    const page = doc.pages[0]
    expect(page.layout).toBe("future-layout")
    expect(page).not.toHaveProperty("items")
    expect(page).not.toHaveProperty("panel")
  })

  it("rejects html layout page with missing or empty htmlFile", () => {
    expect(() =>
      parseWeekDocument({
        start: "2026-08-24",
        end: "2026-08-28",
        pages: [
          {
            id: "p03",
            layout: "html",
            title: "Escape Hatch",
          },
        ],
      })
    ).toThrow(/htmlFile/i)

    expect(() =>
      parseWeekDocument({
        start: "2026-08-24",
        end: "2026-08-28",
        pages: [
          {
            id: "p03",
            layout: "html",
            title: "Escape Hatch",
            htmlFile: "",
          },
        ],
      })
    ).toThrow(/htmlFile/i)
  })

  it("rejects a week document whose page ids are not unique", () => {
    expect(() =>
      parseWeekDocument({
        start: "2026-08-24",
        end: "2026-08-28",
        pages: [
          {
            id: "p01",
            layout: "html",
            title: "First",
            htmlFile: "p01.html",
          },
          {
            id: "p01",
            layout: "html",
            title: "Duplicate",
            htmlFile: "p02.html",
          },
        ],
      })
    ).toThrow(/unique/i)
  })

  it("accepts custom non-pNN page ids when they are unique", () => {
    const doc = parseWeekDocument({
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          id: "escape-hatch",
          layout: "html",
          title: "Custom id",
          htmlFile: "p03.html",
        },
      ],
    })

    expect(doc.pages[0].id).toBe("escape-hatch")
  })

  it("parses a weekly-overview page and strips extra nested fields", () => {
    const doc = parseWeekDocument({
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          id: "p01",
          layout: "weekly-overview",
          title: "Delivery recovered",
          extra: "drop-me",
          lead: {
            workstream: "Delivery",
            figure: "5 days",
            result: "Turnaround fell",
            impact: "Same week",
            extra: "nope",
            status: {
              label: "On track",
              tone: "positive",
              extra: true,
            },
          },
          supporting: [
            {
              workstream: "Accuracy",
              figure: "1.2%",
              result: "Faults dropped",
              impact: "Fewer late fixes",
              status: { label: "Improved", tone: "caution" },
            },
          ],
        },
      ],
    })

    expect(doc.pages[0]).toEqual({
      id: "p01",
      layout: "weekly-overview",
      title: "Delivery recovered",
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
      ],
    })
  })

  it("accepts a blank weekly-overview draft with one to three supporting outcomes", () => {
    const supporting = [
      {
        workstream: "",
        figure: "",
        result: "",
        impact: "",
        status: { label: "", tone: "neutral" },
      },
      {
        workstream: "",
        figure: "",
        result: "",
        impact: "",
        status: { label: "", tone: "neutral" },
      },
    ]

    const doc = parseWeekDocument({
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          id: "p01",
          layout: "weekly-overview",
          title: "",
          lead: {
            workstream: "",
            figure: "",
            result: "",
            impact: "",
            status: { label: "", tone: "neutral" },
          },
          supporting,
        },
      ],
    })

    expect(doc.pages[0].layout).toBe("weekly-overview")
    if (doc.pages[0].layout !== "weekly-overview") {
      throw new Error("expected weekly-overview")
    }
    expect(doc.pages[0].supporting).toHaveLength(2)
  })

  it("rejects weekly-overview pages outside the supporting cardinality", () => {
    const blankOutcome = {
      workstream: "",
      figure: "",
      result: "",
      impact: "",
      status: { label: "", tone: "neutral" },
    }

    expect(() =>
      parseWeekDocument({
        start: "2026-08-24",
        end: "2026-08-28",
        pages: [
          {
            id: "p01",
            layout: "weekly-overview",
            title: "",
            lead: blankOutcome,
            supporting: [],
          },
        ],
      })
    ).toThrow(/supporting/i)

    expect(() =>
      parseWeekDocument({
        start: "2026-08-24",
        end: "2026-08-28",
        pages: [
          {
            id: "p01",
            layout: "weekly-overview",
            title: "",
            lead: blankOutcome,
            supporting: [
              blankOutcome,
              blankOutcome,
              blankOutcome,
              blankOutcome,
            ],
          },
        ],
      })
    ).toThrow(/supporting/i)
  })

  it("rejects weekly-overview pages with an unknown status tone", () => {
    expect(() =>
      parseWeekDocument({
        start: "2026-08-24",
        end: "2026-08-28",
        pages: [
          {
            id: "p01",
            layout: "weekly-overview",
            title: "",
            lead: {
              workstream: "",
              figure: "",
              result: "",
              impact: "",
              status: { label: "", tone: "on-track" },
            },
            supporting: [
              {
                workstream: "",
                figure: "",
                result: "",
                impact: "",
                status: { label: "", tone: "neutral" },
              },
            ],
          },
        ],
      })
    ).toThrow(/tone/i)
  })

  it("rejects html layout page with invalid htmlFile paths", () => {
    expect(() =>
      parseWeekDocument({
        start: "2026-08-24",
        end: "2026-08-28",
        pages: [
          {
            id: "p03",
            layout: "html",
            title: "Escape Hatch",
            htmlFile: "../evil.html",
          },
        ],
      })
    ).toThrow(/htmlFile|traversal|path/i)

    expect(() =>
      parseWeekDocument({
        start: "2026-08-24",
        end: "2026-08-28",
        pages: [
          {
            id: "p03",
            layout: "html",
            title: "Escape Hatch",
            htmlFile: "slide.txt",
          },
        ],
      })
    ).toThrow(/html/i)
  })

  it("rejects a chart panel whose series value is not a number", () => {
    expect(() =>
      parseWeekDocument(
        twoColumnWeekWithPanel({
          kind: "chart",
          title: "Latency",
          categories: ["Mon", "Tue"],
          series: [{ name: "p95", values: [12, "fast"] }],
        })
      )
    ).toThrow(/panel\.series\[0\]\.values\[1\]/)
  })

  it("rejects chart, flow, and checklist panels missing their entry arrays", () => {
    const panels = [
      { kind: "chart", title: "Latency", series: [] },
      { kind: "chart", title: "Latency", categories: [] },
      { kind: "flow", title: "Pipeline" },
      { kind: "checklist", title: "Launch" },
    ]

    for (const panel of panels) {
      expect(() => parseWeekDocument(twoColumnWeekWithPanel(panel))).toThrow(
        /panel\.(categories|series|steps|items)/
      )
    }
  })

  it("parses optional showPageNumbers at the week root and showPageNumber on pages", () => {
    const week = parseWeekDocument({
      start: "2026-08-24",
      end: "2026-08-28",
      showPageNumbers: false,
      pages: [
        {
          id: "p01",
          layout: "html",
          title: "Override show",
          htmlFile: "p01.html",
          showPageNumber: true,
        },
        {
          id: "p02",
          layout: "html",
          title: "Inherit default",
          htmlFile: "p02.html",
        },
        {
          id: "p03",
          layout: "two-column",
          title: "Override hide",
          showPageNumber: false,
          items: [
            { heading: "A", body: "1" },
            { heading: "B", body: "2" },
            { heading: "C", body: "3" },
          ],
          panel: {
            kind: "checklist",
            title: "Tasks",
            items: [{ label: "Done", checked: true }],
          },
        },
      ],
    })

    expect(week.showPageNumbers).toBe(false)
    expect(week.pages[0].showPageNumber).toBe(true)
    expect(week.pages[1].showPageNumber).toBeUndefined()
    expect(week.pages[2].showPageNumber).toBe(false)
  })

  it("normalizes non-boolean showPageNumbers and showPageNumber as undefined", () => {
    const week = parseWeekDocument({
      start: "2026-08-24",
      end: "2026-08-28",
      showPageNumbers: "invalid",
      pages: [
        {
          id: "p01",
          layout: "html",
          title: "Page",
          htmlFile: "p01.html",
          showPageNumber: 123,
        },
      ],
    })

    expect(week.showPageNumbers).toBeUndefined()
    expect(week.pages[0].showPageNumber).toBeUndefined()
  })
})
