import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import {
  setPageHidden,
  setPageItem,
  setPageNotes,
  setPageTitle,
  setTablePanelCell,
  setTablePanelTitle,
} from "@/lib/week-editor"
import { parseWeekDocument } from "@/lib/week-document"

const fixturePath = resolve(
  import.meta.dirname,
  "../../weeks/2026-08-24.json"
)

function loadFixture() {
  return parseWeekDocument(
    JSON.parse(readFileSync(fixturePath, "utf-8"))
  )
}

describe("week-editor", () => {
  it("maps title edits onto the week document", () => {
    const week = loadFixture()
    const next = setPageTitle(week, 1, "Platform · Eval Gate (edited)")

    expect(next.pages[1].title).toBe("Platform · Eval Gate (edited)")
    expect(week.pages[1].title).toBe("Platform · Eval Gate")
  })

  it("maps item heading and body edits onto the week document", () => {
    const week = loadFixture()
    const withHeading = setPageItem(week, 1, 1, "heading", "Manual promote")
    const withBody = setPageItem(withHeading, 1, 1, "body", "Updated body copy")

    expect(withBody.pages[1].items[1]).toEqual({
      heading: "Manual promote",
      body: "Updated body copy",
    })
  })

  it("maps table panel edits onto the week document", () => {
    const week = loadFixture()
    const withTitle = setTablePanelTitle(week, 1, "Loaded model (edited)")
    const withCell = setTablePanelCell(withTitle, 1, 0, 1, "Unpinned")

    const panel = withCell.pages[1].panel
    if (panel.kind !== "table") {
      throw new Error("expected table panel")
    }

    expect(panel.title).toBe("Loaded model (edited)")
    expect(panel.rows[0].cells[1]).toBe("Unpinned")
  })

  it("persists hide flag on the page", () => {
    const week = loadFixture()
    const hidden = setPageHidden(week, 1, true)
    const visible = setPageHidden(hidden, 1, false)

    expect(hidden.pages[1].hidden).toBe(true)
    expect(visible.pages[1].hidden).toBeUndefined()
  })

  it("maps speaker notes onto the week document", () => {
    const week = loadFixture()
    const next = setPageNotes(week, 1, "Updated talking points")

    expect(next.pages[1].notes).toBe("Updated talking points")
  })
})
