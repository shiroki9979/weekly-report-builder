import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import {
  addFlowStep,
  moveFlowStep,
  setFlowPanelTitle,
  setFlowStepCaption,
  setFlowStepLabel,
} from "@/lib/week-editor"
import { parseWeekDocument } from "@/lib/week-document"

const fixturePath = resolve(import.meta.dirname, "../fixtures/flow-week.json")

function loadFlowWeek() {
  return parseWeekDocument(JSON.parse(readFileSync(fixturePath, "utf-8")))
}

function flowPanel(week: ReturnType<typeof loadFlowWeek>) {
  const panel = week.pages[0].panel
  if (panel.kind !== "flow") {
    throw new Error("expected flow panel")
  }
  return panel
}

describe("flow week-editor", () => {
  it("maps step edits onto the week document", () => {
    const week = loadFlowWeek()
    const withTitle = setFlowPanelTitle(week, 0, "Import path")
    const withLabel = setFlowStepLabel(withTitle, 0, 0, "Source environment")
    const withCaption = setFlowStepCaption(withLabel, 0, 0, "@staging")

    const panel = flowPanel(withCaption)
    expect(panel.title).toBe("Import path")
    expect(panel.steps[0]).toEqual({
      label: "Source environment",
      caption: "@staging",
      variant: "default",
    })
  })

  it("reorders steps in the flow panel", () => {
    const week = loadFlowWeek()
    const reordered = moveFlowStep(week, 0, 0, 2)

    const panel = flowPanel(reordered)
    expect(panel.steps.map((step) => step.label)).toEqual([
      "Download tar.gz",
      "Target env",
      "Source env",
      "Upload + contract check",
    ])
  })

  it("adds a new step at the end", () => {
    const week = loadFlowWeek()
    const withStep = addFlowStep(week, 0)

    expect(flowPanel(withStep).steps).toHaveLength(5)
    expect(flowPanel(withStep).steps[4]).toEqual({
      label: "",
      caption: undefined,
    })
  })
})
