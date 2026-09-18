import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import {
  assertTwoColumnPage,
  setPageHidden,
  setPageHtmlFile,
  setPageItem,
  setPageNotes,
  setPageTitle,
  setTablePanelCell,
  setTablePanelTitle,
} from "@/lib/week-editor"
import { parseWeekDocument } from "@/lib/week-document"

const fixturePath = resolve(
  import.meta.dirname,
  "../fixtures/two-column-week.json"
)

function loadFixture() {
  return parseWeekDocument(JSON.parse(readFileSync(fixturePath, "utf-8")))
}

describe("week-editor", () => {
  it("maps title edits onto the week document", () => {
    const week = loadFixture()
    const next = setPageTitle(week, 0, "Eval Gate (edited)")

    expect(next.pages[0].title).toBe("Eval Gate (edited)")
    expect(week.pages[0].title).toBe("Eval Gate")
  })

  it("maps item heading and body edits onto the week document", () => {
    const week = loadFixture()
    const withHeading = setPageItem(week, 0, 1, "heading", "Manual promote")
    const withBody = setPageItem(withHeading, 0, 1, "body", "Updated body copy")

    expect(withBody.pages[0].items[1]).toEqual({
      heading: "Manual promote",
      body: "Updated body copy",
    })
  })

  it("maps table panel edits onto the week document", () => {
    const week = loadFixture()
    const withTitle = setTablePanelTitle(week, 0, "Loaded model (edited)")
    const withCell = setTablePanelCell(withTitle, 0, 0, 1, "Unpinned")

    const panel = withCell.pages[0].panel
    if (panel.kind !== "table") {
      throw new Error("expected table panel")
    }

    expect(panel.title).toBe("Loaded model (edited)")
    expect(panel.rows[0].cells[1]).toBe("Unpinned")
  })

  it("persists hide flag on the page", () => {
    const week = loadFixture()
    const hidden = setPageHidden(week, 0, true)
    const visible = setPageHidden(hidden, 0, false)

    expect(hidden.pages[0].hidden).toBe(true)
    expect(visible.pages[0].hidden).toBeUndefined()
  })

  it("maps speaker notes onto the week document", () => {
    const week = loadFixture()
    const next = setPageNotes(week, 0, "Updated talking points")

    expect(next.pages[0].notes).toBe("Updated talking points")
  })

  it("maps htmlFile edits onto html layout pages", () => {
    const week = parseWeekDocument({
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          id: "p03",
          layout: "html",
          title: "Custom HTML",
          htmlFile: "p03.html",
        },
      ],
    })

    const next = setPageHtmlFile(week, 0, "p03-v2.html")
    const page = next.pages[0]
    if (page.layout !== "html") {
      throw new Error("expected html page")
    }
    expect(page.htmlFile).toBe("p03-v2.html")

    // 驗證型別防衛機制：two-column 頁面不應接受 htmlFile 欄位修改
    const twoColWeek = loadFixture()
    expect(() => setPageHtmlFile(twoColWeek, 0, "bad.html")).toThrow(
      /not an HTML page/i
    )
  })

  it("assertTwoColumnPage rejects pages with html layout", () => {
    const htmlWeek = parseWeekDocument({
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          id: "p03",
          layout: "html",
          title: "Custom HTML",
          htmlFile: "p03.html",
        },
      ],
    })

    // 驗證針對非 two-column 頁面執行結構化編輯操作時會拋出明確錯誤，防止資料結構毀損
    expect(() => assertTwoColumnPage(htmlWeek.pages[0])).toThrow(
      "Week Page p03 is not a two-column page"
    )
    expect(() => setPageItem(htmlWeek, 0, 0, "heading", "fail")).toThrow(
      "Week Page p03 is not a two-column page"
    )
  })
})
