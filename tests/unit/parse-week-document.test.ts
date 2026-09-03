import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { parseWeekDocument } from "@/lib/week-document"

const fixturePath = resolve(
  import.meta.dirname,
  "../../weeks/2026-08-24.json"
)

describe("parseWeekDocument", () => {
  it("parses the week fixture with two-column layout and table panel", () => {
    const raw = readFileSync(fixturePath, "utf-8")
    const week = parseWeekDocument(JSON.parse(raw))

    expect(week.start).toBe("2026-08-24")
    expect(week.end).toBe("2026-08-28")
    expect(week.pages).toHaveLength(7)

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
    // @ts-expect-error html page does not have items
    expect(page.items).toBeUndefined()
    // @ts-expect-error html page does not have panel
    expect(page.panel).toBeUndefined()
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
