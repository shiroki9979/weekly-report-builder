import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import {
  removeChartCategory,
  removeChartSeries,
  removeChecklistItem,
  removeFlowStep,
  setPageHidden,
  setPageHtmlFile,
  setPageItem,
  setPageNotes,
  setPageShowPageNumber,
  setPageTitle,
  setTablePanelCell,
  setTablePanelTitle,
  setWeekShowPageNumbers,
} from "@/lib/week-editor"
import { createBlankTwoColumnPage } from "@/lib/page-lifecycle"
import { parseWeekDocument, type WeekDocument } from "@/lib/week-document"

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

  it("rejects two-column item edits on an HTML page", () => {
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
    expect(() => setPageItem(htmlWeek, 0, 0, "heading", "fail")).toThrow(
      "Week Page p03 is not a two-column page"
    )
  })

  it("updates week-level page-number visibility with setWeekShowPageNumbers", () => {
    const week = loadFixture()
    const hidden = setWeekShowPageNumbers(week, false)
    expect(hidden.showPageNumbers).toBe(false)
    expect(week.showPageNumbers).toBeUndefined()

    const shown = setWeekShowPageNumbers(hidden, true)
    expect(shown.showPageNumbers).toBe(true)
  })

  it("updates page-level page-number visibility override with setPageShowPageNumber", () => {
    const week = loadFixture()
    const overrideHide = setPageShowPageNumber(week, 0, false)
    expect(overrideHide.pages[0].showPageNumber).toBe(false)

    const overrideShow = setPageShowPageNumber(overrideHide, 0, true)
    expect(overrideShow.pages[0].showPageNumber).toBe(true)

    const resetToInherit = setPageShowPageNumber(overrideShow, 0, undefined)
    expect(resetToInherit.pages[0].showPageNumber).toBeUndefined()
  })

  it("keeps at least one entry in chart, flow, and checklist panels", () => {
    const weekWith = (kind: "chart" | "flow" | "checklist"): WeekDocument => ({
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [createBlankTwoColumnPage("p01", kind)],
    })

    expect(() => removeChartCategory(weekWith("chart"), 0, 0)).toThrow(
      "Chart must keep at least 1 category"
    )
    expect(() => removeChartSeries(weekWith("chart"), 0, 0)).toThrow(
      "Chart must keep at least 1 series"
    )
    expect(() => removeFlowStep(weekWith("flow"), 0, 0)).toThrow(
      "Flow must keep at least 1 step"
    )
    expect(() => removeChecklistItem(weekWith("checklist"), 0, 0)).toThrow(
      "Checklist must keep at least 1 item"
    )
  })
})
