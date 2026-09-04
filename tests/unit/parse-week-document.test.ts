import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { parseWeekDocument } from "@/lib/week-document"

const fixturePath = resolve(
  import.meta.dirname,
  "../../weeks/2026-08-24.json"
)

const fixture20260831Path = resolve(
  import.meta.dirname,
  "../../weeks/2026-08-31.json"
)

describe("parseWeekDocument", () => {
  it("parses the week fixture with two-column layout and table panel", () => {
    const raw = readFileSync(fixturePath, "utf-8")
    const week = parseWeekDocument(JSON.parse(raw))

    expect(week.start).toBe("2026-08-24")
    expect(week.end).toBe("2026-08-28")
    expect(week.pages).toHaveLength(10)

    const page = week.pages[3]
    expect(page.layout).toBe("two-column")
    expect(page.title).toBe("Platform · Eval Gate")
    expect(page.items).toHaveLength(3)
    expect(page.items[0].heading).toBe("評估指標依任務設定")
    expect(page.panel.kind).toBe("table")

    if (page.panel.kind !== "table") {
      throw new Error("expected table panel")
    }

    expect(page.panel.columns).toEqual(["動作", "對正式版", "結果"])
    expect(page.panel.rows[0].cells).toEqual([
      "排程評估",
      "釘住中",
      "skip 晉升",
    ])

    const htmlPage = week.pages[7]
    expect(htmlPage.layout).toBe("html")
    if (htmlPage.layout !== "html") {
      throw new Error("expected html page")
    }
    expect(htmlPage.htmlFile).toBe("p08.html")
  })

  it("parses the 2026-08-31 week with interleaved html chart pages", () => {
    const raw = readFileSync(fixture20260831Path, "utf-8")
    const week = parseWeekDocument(JSON.parse(raw))

    expect(week.start).toBe("2026-08-31")
    expect(week.end).toBe("2026-09-04")
    expect(week.pages).toHaveLength(11)
    expect(week.pages.map((page) => page.id)).toEqual([
      "p01",
      "p02",
      "p03",
      "p04",
      "p05",
      "p06",
      "p07",
      "p08",
      "p09",
      "p10",
      "p11",
    ])
    expect(week.pages.map((page) => page.layout)).toEqual([
      "two-column",
      "two-column",
      "two-column",
      "html",
      "two-column",
      "html",
      "two-column",
      "html",
      "two-column",
      "html",
      "two-column",
    ])

    const htmlFiles = week.pages
      .filter((page) => page.layout === "html")
      .map((page) => {
        if (page.layout !== "html") {
          throw new Error("expected html page")
        }
        return page.htmlFile
      })
    expect(htmlFiles).toEqual(["p04.html", "p06.html", "p08.html", "p10.html"])

    // Grill 共識：全稿不出現「備援」
    expect(JSON.stringify(week)).not.toMatch(/備援/)
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
})
