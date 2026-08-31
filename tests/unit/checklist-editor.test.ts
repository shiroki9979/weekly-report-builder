import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import {
  addChecklistItem,
  removeChecklistItem,
  setChecklistItemChecked,
  setChecklistItemLabel,
  setChecklistPanelTitle,
} from "@/lib/week-editor"
import { parseWeekDocument } from "@/lib/week-document"

const fixturePath = resolve(
  import.meta.dirname,
  "../fixtures/checklist-week.json"
)

function loadChecklistWeek() {
  return parseWeekDocument(JSON.parse(readFileSync(fixturePath, "utf-8")))
}

function checklistPanel(week: ReturnType<typeof loadChecklistWeek>) {
  const panel = week.pages[0].panel
  if (panel.kind !== "checklist") {
    throw new Error("expected checklist panel")
  }
  return panel
}

describe("checklist week-editor", () => {
  it("maps item edits onto the week document", () => {
    const week = loadChecklistWeek()
    const withTitle = setChecklistPanelTitle(week, 0, "Week checklist")
    const withLabel = setChecklistItemLabel(
      withTitle,
      0,
      0,
      "Scale diagnostics pass"
    )
    const withChecked = setChecklistItemChecked(withLabel, 0, 1, true)

    const panel = checklistPanel(withChecked)
    expect(panel.title).toBe("Week checklist")
    expect(panel.items[0].label).toBe("Scale diagnostics pass")
    expect(panel.items[1].checked).toBe(true)
  })

  it("adds and removes checklist items", () => {
    const week = loadChecklistWeek()
    const withItem = addChecklistItem(week, 0)
    const withoutItem = removeChecklistItem(withItem, 0, 0)

    expect(checklistPanel(withItem).items).toHaveLength(5)
    expect(checklistPanel(withItem).items[4]).toEqual({ label: "", checked: false })
    expect(checklistPanel(withoutItem).items).toHaveLength(4)
    expect(checklistPanel(withoutItem).items[0].label).toBe(
      "Compile Detroit day-1 baseline table"
    )
  })
})
