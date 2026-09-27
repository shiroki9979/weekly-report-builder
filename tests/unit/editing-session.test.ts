import { describe, expect, it } from "vitest"

import {
  addSessionPage,
  canSaveSession,
  createEditingSession,
  deleteSessionPage,
  editSessionContent,
  moveSessionMetric,
  moveSessionPage,
  openSessionWeek,
  readMetricInput,
  removeSessionMetric,
  selectSessionPage,
  sessionReadiness,
  writeMetricInput,
} from "@/lib/editing-session"
import { createBlankEvidenceDecisionPage } from "@/lib/page-lifecycle"
import type { WeekDocument } from "@/lib/week-document"

function week(ids: string[]): WeekDocument {
  return {
    start: "2026-08-24",
    end: "2026-08-28",
    pages: ids.map(createBlankEvidenceDecisionPage),
  }
}

describe("Editing Session", () => {
  it("discards invalid input with its deleted page, including when the ID is reused", () => {
    let session = createEditingSession(week(["p01", "p02"]))
    session = writeMetricInput(session, "p02", 0, "baselineValue", "bad")
    expect(canSaveSession(session).allowed).toBe(false)

    session = deleteSessionPage(session, "p02")
    session = addSessionPage(session, createBlankEvidenceDecisionPage("p02"))

    expect(canSaveSession(session).allowed).toBe(true)
    expect(readMetricInput(session, "p02", 0, "baselineValue")).toBe("")
  })

  it("keeps verbatim input with metrics through moves and removals for colon IDs", () => {
    let session = createEditingSession(week(["ops:1"]))
    session = writeMetricInput(session, "ops:1", 0, "baselineValue", "1.50")
    session = writeMetricInput(session, "ops:1", 1, "candidateValue", "bad")

    session = moveSessionMetric(session, "ops:1", 1, 0)
    expect(readMetricInput(session, "ops:1", 0, "candidateValue")).toBe("bad")
    expect(readMetricInput(session, "ops:1", 1, "baselineValue")).toBe("1.50")
    session = removeSessionMetric(session, "ops:1", 0)
    expect(readMetricInput(session, "ops:1", 0, "baselineValue")).toBe("1.50")
    expect(canSaveSession(session).allowed).toBe(true)
  })

  it("throws on forbidden removal without changing the session", () => {
    let session = createEditingSession(week(["p01"]))
    session = removeSessionMetric(session, "p01", 1)
    session = writeMetricInput(session, "p01", 0, "baselineValue", "bad")
    expect(() => removeSessionMetric(session, "p01", 0)).toThrow()
    expect(session.week?.pages[0]).toHaveProperty("metrics")
    expect(readMetricInput(session, "p01", 0, "baselineValue")).toBe("bad")
    expect(canSaveSession(session).allowed).toBe(false)
  })

  it("opens another week without previous Metric Input", () => {
    let session = createEditingSession(week(["p01"]))
    session = writeMetricInput(session, "p01", 0, "baselineValue", "bad")
    session = canSaveSession(session).session
    session = openSessionWeek(session, week(["p01"]))
    expect(readMetricInput(session, "p01", 0, "baselineValue")).toBe("")
    expect(session.saveError).toBeNull()
    expect(canSaveSession(session).allowed).toBe(true)
  })

  it("updates valid values immediately while keeping exact display text", () => {
    let session = createEditingSession(week(["p01"]))
    session = writeMetricInput(session, "p01", 0, "baselineValue", "1.50")
    expect(readMetricInput(session, "p01", 0, "baselineValue")).toBe("1.50")
    expect(session.week?.pages[0]).toHaveProperty(
      "metrics.0.baselineValue",
      1.5
    )

    session = writeMetricInput(session, "p01", 0, "baselineValue", "bad")
    expect(session.week?.pages[0]).toHaveProperty(
      "metrics.0.baselineValue",
      1.5
    )
    expect(sessionReadiness(session, "p01")).toContainEqual({
      code: "invalid-content",
      path: "metrics[0].baselineValue",
      message: "Metric value must be a finite non-negative number",
    })
  })

  it("keeps input and selection attached to pages across content edits and page moves", () => {
    let session = createEditingSession(week(["p01", "p02"]))
    session = selectSessionPage(session, "p02")
    session = writeMetricInput(session, "p02", 0, "baselineValue", "2.00")
    session = moveSessionPage(session, "p02", "up")
    session = editSessionContent(session, (current) => ({
      ...current,
      end: "2026-08-29",
    }))

    expect(session.selectedPageId).toBe("p02")
    expect(session.week?.pages.map((page) => page.id)).toEqual(["p02", "p01"])
    expect(readMetricInput(session, "p02", 0, "baselineValue")).toBe("2.00")
  })

  it("rejects metric removal through the general content edit entry", () => {
    const session = createEditingSession(week(["p01"]))
    expect(() =>
      editSessionContent(session, (current) => ({
        ...current,
        pages: current.pages.map((page) =>
          page.layout === "evidence-decision"
            ? { ...page, metrics: page.metrics.slice(1) }
            : page
        ),
      }))
    ).toThrow("Metric changes require a dedicated Editing Session operation")
    expect(session.week?.pages[0]).toHaveProperty("metrics.length", 2)
  })
})
