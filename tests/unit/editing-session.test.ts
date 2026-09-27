import { describe, expect, it } from "vitest"

import {
  addSessionMetric,
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
  sessionOperationSnapshot,
  sessionReadiness,
  writeMetricInput,
} from "@/lib/editing-session"
import { createBlankEvidenceDecisionPage } from "@/lib/page-lifecycle"
import {
  blankMetric,
  setDecisionMetricFormat,
  setDecisionMetricLabel,
} from "@/lib/evidence-decision-editor"
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
    session = writeMetricInput(
      session,
      { pageId: "p02", metricIndex: 0, field: "baselineValue" },
      "bad"
    )
    expect(canSaveSession(session).allowed).toBe(false)

    session = deleteSessionPage(session, "p02")
    session = addSessionPage(session, createBlankEvidenceDecisionPage("p02"))

    expect(canSaveSession(session).allowed).toBe(true)
    expect(
      readMetricInput(session, {
        pageId: "p02",
        metricIndex: 0,
        field: "baselineValue",
      })
    ).toBe("")
  })

  it("keeps verbatim input with metrics through moves and removals for colon IDs", () => {
    let session = createEditingSession(week(["ops:1"]))
    session = writeMetricInput(
      session,
      { pageId: "ops:1", metricIndex: 0, field: "baselineValue" },
      "1.50"
    )
    session = writeMetricInput(
      session,
      { pageId: "ops:1", metricIndex: 1, field: "candidateValue" },
      "bad"
    )

    session = moveSessionMetric(session, {
      pageId: "ops:1",
      fromIndex: 1,
      toIndex: 0,
    })
    expect(
      readMetricInput(session, {
        pageId: "ops:1",
        metricIndex: 0,
        field: "candidateValue",
      })
    ).toBe("bad")
    expect(
      readMetricInput(session, {
        pageId: "ops:1",
        metricIndex: 1,
        field: "baselineValue",
      })
    ).toBe("1.50")
    session = removeSessionMetric(session, { pageId: "ops:1", metricIndex: 0 })
    expect(
      readMetricInput(session, {
        pageId: "ops:1",
        metricIndex: 0,
        field: "baselineValue",
      })
    ).toBe("1.50")
    expect(canSaveSession(session).allowed).toBe(true)
  })

  it("throws on forbidden removal without changing the session", () => {
    let session = createEditingSession(week(["p01"]))
    session = removeSessionMetric(session, { pageId: "p01", metricIndex: 1 })
    session = writeMetricInput(
      session,
      { pageId: "p01", metricIndex: 0, field: "baselineValue" },
      "bad"
    )

    expect(() =>
      removeSessionMetric(session, { pageId: "p01", metricIndex: 0 })
    ).toThrow("Evidence-backed Decision must keep at least 1 metric")
    expect(session.week?.pages[0]).toHaveProperty("metrics.length", 1)
    expect(
      readMetricInput(session, {
        pageId: "p01",
        metricIndex: 0,
        field: "baselineValue",
      })
    ).toBe("bad")
    expect(canSaveSession(session).allowed).toBe(false)
  })

  it("opens another week without previous Metric Input", () => {
    let session = createEditingSession(week(["p01"]))
    session = writeMetricInput(
      session,
      { pageId: "p01", metricIndex: 0, field: "baselineValue" },
      "bad"
    )
    session = canSaveSession(session).session
    session = openSessionWeek(session, week(["p01"]))
    expect(
      readMetricInput(session, {
        pageId: "p01",
        metricIndex: 0,
        field: "baselineValue",
      })
    ).toBe("")
    expect(session.saveError).toBeNull()
    expect(canSaveSession(session).allowed).toBe(true)
  })

  it("keeps the save error when Metric Input changes", () => {
    let session = createEditingSession(week(["p01"]))
    session = writeMetricInput(
      session,
      { pageId: "p01", metricIndex: 0, field: "baselineValue" },
      "bad"
    )
    session = canSaveSession(session).session

    session = writeMetricInput(
      session,
      { pageId: "p01", metricIndex: 0, field: "baselineValue" },
      "1.50"
    )

    expect(session.saveError).toBe("Fix invalid metric values before saving")
  })

  it("updates valid values immediately while keeping exact display text", () => {
    let session = createEditingSession(week(["p01"]))
    session = writeMetricInput(
      session,
      { pageId: "p01", metricIndex: 0, field: "baselineValue" },
      "1.50"
    )
    expect(
      readMetricInput(session, {
        pageId: "p01",
        metricIndex: 0,
        field: "baselineValue",
      })
    ).toBe("1.50")
    expect(session.week?.pages[0]).toHaveProperty(
      "metrics.0.baselineValue",
      1.5
    )

    session = writeMetricInput(
      session,
      { pageId: "p01", metricIndex: 0, field: "baselineValue" },
      "bad"
    )
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
    session = writeMetricInput(
      session,
      { pageId: "p02", metricIndex: 0, field: "baselineValue" },
      "2.00"
    )
    session = moveSessionPage(session, "p02", "up")
    session = editSessionContent(session, (current) => ({
      ...current,
      end: "2026-08-29",
    }))

    expect(session.selectedPageId).toBe("p02")
    expect(session.week?.pages.map((page) => page.id)).toEqual(["p02", "p01"])
    expect(
      readMetricInput(session, {
        pageId: "p02",
        metricIndex: 0,
        field: "baselineValue",
      })
    ).toBe("2.00")
  })

  it("keeps a read-only operation snapshot after metric, page, and week changes", () => {
    let session = createEditingSession(week(["p01", "p02"]))
    session = selectSessionPage(session, "p02")
    session = writeMetricInput(
      session,
      { pageId: "p02", metricIndex: 0, field: "baselineValue" },
      "1.50"
    )
    const snapshot = sessionOperationSnapshot(session)!

    session = writeMetricInput(
      session,
      { pageId: "p02", metricIndex: 0, field: "baselineValue" },
      "bad"
    )
    session = moveSessionPage(session, "p02", "up")
    session = deleteSessionPage(session, "p01")
    session = openSessionWeek(session, week(["other"]))

    expect(snapshot.monday).toBe("2026-08-24")
    expect(snapshot.selectedPageId).toBe("p02")
    expect(snapshot.week.pages.map((page) => page.id)).toEqual(["p01", "p02"])
    expect(snapshot.metricInput.p02["metrics[0].baselineValue"]).toBe("1.50")
    expect(Object.isFrozen(snapshot.week.pages[1])).toBe(true)
    expect(Object.isFrozen(snapshot.metricInput.p02)).toBe(true)
    expect(session.week?.pages.map((page) => page.id)).toEqual(["other"])
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

  it("rejects cloned metric swaps so Metric Input stays with its metric", () => {
    const document = week(["p01"])
    const page = document.pages[0]
    if (page.layout !== "evidence-decision")
      throw new Error("Unexpected layout")
    page.metrics[0].label = "First"
    page.metrics[1].label = "Second"
    let session = createEditingSession(document)
    session = writeMetricInput(
      session,
      { pageId: "p01", metricIndex: 0, field: "baselineValue" },
      "1.50"
    )
    const original = session.week

    expect(() =>
      editSessionContent(session, (current) => ({
        ...current,
        pages: current.pages.map((page) =>
          page.layout === "evidence-decision"
            ? {
                ...page,
                metrics: [{ ...page.metrics[1] }, { ...page.metrics[0] }],
              }
            : page
        ),
      }))
    ).toThrow("Metric changes require a dedicated Editing Session operation")
    expect(session.week).toBe(original)
    expect(
      readMetricInput(session, {
        pageId: "p01",
        metricIndex: 0,
        field: "baselineValue",
      })
    ).toBe("1.50")
  })

  it("rejects a prepended metric so existing Metric Input keeps its owner", () => {
    const document = week(["p01"])
    const page = document.pages[0]
    if (page.layout !== "evidence-decision")
      throw new Error("Unexpected layout")
    page.metrics = [{ ...page.metrics[0], label: "Original" }]
    let session = createEditingSession(document)
    session = writeMetricInput(
      session,
      { pageId: "p01", metricIndex: 0, field: "baselineValue" },
      "bad"
    )
    const original = session.week

    expect(() =>
      editSessionContent(session, (current) => {
        const next = structuredClone(current)
        const page = next.pages[0]
        if (page.layout !== "evidence-decision")
          throw new Error("Unexpected layout")
        page.metrics.unshift(blankMetric())
        return next
      })
    ).toThrow("Metric changes require a dedicated Editing Session operation")
    expect(session.week).toBe(original)
    expect(
      readMetricInput(session, {
        pageId: "p01",
        metricIndex: 0,
        field: "baselineValue",
      })
    ).toBe("bad")
  })

  it("rejects an in-place metric insertion without changing the open week", () => {
    const document = week(["p01"])
    const page = document.pages[0]
    if (page.layout !== "evidence-decision")
      throw new Error("Unexpected layout")
    page.metrics = [page.metrics[0]]
    let session = createEditingSession(document)
    session = writeMetricInput(
      session,
      { pageId: "p01", metricIndex: 0, field: "baselineValue" },
      "bad"
    )
    const original = session.week

    expect(() =>
      editSessionContent(session, (current) => {
        const page = current.pages[0]
        if (page.layout !== "evidence-decision")
          throw new Error("Unexpected layout")
        page.metrics.unshift(blankMetric())
        return current
      })
    ).toThrow()
    expect(session.week).toBe(original)
    expect(session.week?.pages[0]).toHaveProperty("metrics.length", 1)
    expect(Object.isFrozen(original?.pages[0])).toBe(false)
    expect(
      readMetricInput(session, {
        pageId: "p01",
        metricIndex: 0,
        field: "baselineValue",
      })
    ).toBe("bad")
  })

  it("appends a metric without changing existing Metric Input", () => {
    const document = week(["p01"])
    const page = document.pages[0]
    if (page.layout !== "evidence-decision")
      throw new Error("Unexpected layout")
    page.metrics = page.metrics.slice(0, 1)
    let session = createEditingSession(document)
    session = editSessionContent(session, (current) =>
      setDecisionMetricLabel(current, 0, 0, "Updated")
    )
    session = writeMetricInput(
      session,
      { pageId: "p01", metricIndex: 0, field: "baselineValue" },
      "bad"
    )
    session = addSessionMetric(session, "p01")
    expect(session.week?.pages[0]).toHaveProperty("metrics.0.label", "Updated")
    expect(session.week?.pages[0]).toHaveProperty("metrics.length", 2)
    expect(
      readMetricInput(session, {
        pageId: "p01",
        metricIndex: 0,
        field: "baselineValue",
      })
    ).toBe("bad")
    expect(
      readMetricInput(session, {
        pageId: "p01",
        metricIndex: 1,
        field: "baselineValue",
      })
    ).toBe("")
  })

  it("allows one metric's format fields to change together", () => {
    const session = editSessionContent(
      createEditingSession(week(["p01"])),
      (current) =>
        setDecisionMetricFormat(current, 0, 0, {
          unitPosition: "before",
          unitSpacing: "none",
          precision: 2,
        })
    )

    expect(session.week?.pages[0]).toHaveProperty(
      "metrics.0.unitPosition",
      "before"
    )
    expect(session.week?.pages[0]).toHaveProperty(
      "metrics.0.unitSpacing",
      "none"
    )
    expect(session.week?.pages[0]).toHaveProperty("metrics.0.precision", 2)
  })
})
