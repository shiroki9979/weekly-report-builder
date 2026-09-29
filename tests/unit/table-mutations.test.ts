import { describe, expect, it } from "vitest"

import {
  addTableColumn,
  addTableRow,
  removeTableColumn,
  removeTableRow,
} from "@/lib/deck-editor"
import { parseDeck } from "@/lib/deck"

function tableWeek() {
  return parseDeck({
    period: { start: "2026-08-24", end: "2026-08-28" },
    pages: [
      {
        id: "p01",
        layout: "two-column",
        title: "Table",
        items: [
          { heading: "A", body: "1" },
          { heading: "B", body: "2" },
          { heading: "C", body: "3" },
        ],
        panel: {
          kind: "table",
          title: "Grid",
          columns: ["A", "B"],
          rows: [{ cells: ["1", "2"] }],
        },
      },
    ],
  })
}

function tablePanel(week: ReturnType<typeof tableWeek>) {
  const panel = week.pages[0].panel
  if (panel.kind !== "table") {
    throw new Error("expected table panel")
  }
  return panel
}

describe("table row and column mutations", () => {
  it("adds a row that matches the current column count", () => {
    const next = addTableRow(tableWeek(), 0)
    expect(tablePanel(next).rows).toEqual([
      { cells: ["1", "2"] },
      { cells: ["", ""] },
    ])
  })

  it("adds a column to every row so the table stays rectangular", () => {
    const next = addTableColumn(tableWeek(), 0)
    const panel = tablePanel(next)
    expect(panel.columns).toEqual(["A", "B", ""])
    expect(panel.rows[0].cells).toEqual(["1", "2", ""])
  })

  it("refuses to remove the last row or column", () => {
    const week = addTableRow(tableWeek(), 0)
    const withoutExtraRow = removeTableRow(week, 0, 1)

    expect(() => removeTableRow(withoutExtraRow, 0, 0)).toThrow(/row/i)
    expect(() =>
      removeTableColumn(removeTableColumn(week, 0, 1), 0, 0)
    ).toThrow(/column/i)
  })

  it("removes a column from every row", () => {
    const next = removeTableColumn(tableWeek(), 0, 0)
    const panel = tablePanel(next)
    expect(panel.columns).toEqual(["B"])
    expect(panel.rows[0].cells).toEqual(["2"])
  })
})
