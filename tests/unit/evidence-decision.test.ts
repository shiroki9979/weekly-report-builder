import { describe, expect, it } from "vitest"

import {
  addDecisionInterpretation,
  addDecisionMetric,
  removeDecisionInterpretation,
  removeDecisionMetric,
  setDecisionMetricValue,
} from "@/lib/evidence-decision-editor"
import { assessContentReadiness } from "@/lib/export-readiness"
import { createBlankEvidenceDecisionPage } from "@/lib/page-lifecycle"
import { createDeckFromTemplate } from "@/lib/deck-template"
import { parseDeck } from "@/lib/deck"
import type { EvidenceDecisionPage, Deck } from "@/lib/deck"

function weekWith(page: EvidenceDecisionPage): Deck {
  return { start: "2026-08-24", end: "2026-08-28", pages: [page] }
}

function decision(week: Deck): EvidenceDecisionPage {
  const page = week.pages[0]
  if (page.layout !== "evidence-decision") {
    throw new Error("expected evidence-decision")
  }
  return page
}

describe("evidence-decision schema", () => {
  it("parses a draft with null metric values and strips extra fields", () => {
    const doc = parseDeck({
      period: { start: "2026-08-24", end: "2026-08-28" },
      pages: [
        {
          id: "p01",
          layout: "evidence-decision",
          title: "Ship the candidate.",
          extra: "drop",
          verdict: "Adopt the candidate.",
          metrics: [
            {
              label: "Turnaround",
              baselineValue: 9.4,
              candidateValue: null,
              unit: "days",
              unitPosition: "after",
              unitSpacing: "space",
              precision: 1,
              extra: true,
            },
          ],
          interpretations: ["The baseline is slower."],
        },
      ],
    })

    expect(doc.pages[0]).toEqual({
      id: "p01",
      layout: "evidence-decision",
      title: "Ship the candidate.",
      verdict: "Adopt the candidate.",
      metrics: [
        {
          label: "Turnaround",
          baselineValue: 9.4,
          candidateValue: null,
          unit: "days",
          unitPosition: "after",
          unitSpacing: "space",
          precision: 1,
        },
      ],
      interpretations: ["The baseline is slower."],
    })
  })

  it("rejects metric and interpretation cardinality outside 1–2", () => {
    const metric = {
      label: "",
      baselineValue: null,
      candidateValue: null,
      unit: "",
      unitPosition: "after",
      unitSpacing: "space",
      precision: 1,
    }

    expect(() =>
      parseDeck({
        period: { start: "2026-08-24", end: "2026-08-28" },
        pages: [
          {
            id: "p01",
            layout: "evidence-decision",
            title: "",
            verdict: "",
            metrics: [],
            interpretations: [""],
          },
        ],
      })
    ).toThrow(/metrics/i)

    expect(() =>
      parseDeck({
        period: { start: "2026-08-24", end: "2026-08-28" },
        pages: [
          {
            id: "p01",
            layout: "evidence-decision",
            title: "",
            verdict: "",
            metrics: [metric, metric, metric],
            interpretations: [""],
          },
        ],
      })
    ).toThrow(/metrics/i)

    expect(() =>
      parseDeck({
        period: { start: "2026-08-24", end: "2026-08-28" },
        pages: [
          {
            id: "p01",
            layout: "evidence-decision",
            title: "",
            verdict: "",
            metrics: [metric],
            interpretations: [],
          },
        ],
      })
    ).toThrow(/interpretations/i)

    expect(() =>
      parseDeck({
        period: { start: "2026-08-24", end: "2026-08-28" },
        pages: [
          {
            id: "p01",
            layout: "evidence-decision",
            title: "",
            verdict: "",
            metrics: [metric],
            interpretations: ["", "", ""],
          },
        ],
      })
    ).toThrow(/interpretations/i)
  })
})

describe("evidence-decision factory and editor", () => {
  it("creates two blank metrics and two interpretations", () => {
    const page = createBlankEvidenceDecisionPage("p02")
    expect(page.metrics).toHaveLength(2)
    expect(page.interpretations).toEqual(["", ""])
    expect(page.metrics[0]).toEqual({
      label: "",
      baselineValue: null,
      candidateValue: null,
      unit: "",
      unitPosition: "after",
      unitSpacing: "space",
      precision: 1,
    })
  })

  it("enforces metric bounds and commits numeric values", () => {
    const week = weekWith(createBlankEvidenceDecisionPage("p01"))
    expect(() => addDecisionMetric(week, 0)).toThrow(/2/)
    const one = removeDecisionMetric(week, 0, 1)
    expect(decision(one).metrics).toHaveLength(1)
    const updated = setDecisionMetricValue(one, 0, 0, "baselineValue", 5)
    expect(decision(updated).metrics[0].baselineValue).toBe(5)
  })

  it("enforces interpretation bounds", () => {
    const week = weekWith(createBlankEvidenceDecisionPage("p01"))
    expect(() => addDecisionInterpretation(week, 0)).toThrow(/2/)
    const one = removeDecisionInterpretation(week, 0, 1)
    expect(decision(one).interpretations).toHaveLength(1)
  })
})

describe("evidence-decision clone and readiness", () => {
  it("keeps metric format and clears weekly values", () => {
    const previous = parseDeck({
      period: { start: "2026-08-24", end: "2026-08-28" },
      pages: [
        {
          id: "p01",
          layout: "evidence-decision",
          title: "Ship it",
          notes: "talk",
          verdict: "Adopt the candidate.",
          metrics: [
            {
              label: "Turnaround",
              baselineValue: 9.4,
              candidateValue: 5.1,
              unit: "days",
              unitPosition: "after",
              unitSpacing: "space",
              precision: 1,
            },
          ],
          interpretations: ["The baseline is slower."],
        },
      ],
    })
    const cloned = createDeckFromTemplate(previous)
    const page = cloned.pages[0]
    if (page.layout !== "evidence-decision") {
      throw new Error("expected evidence-decision")
    }
    expect(page.title).toBe("")
    expect(page.verdict).toBe("")
    expect(page.metrics[0]).toEqual({
      label: "Turnaround",
      baselineValue: null,
      candidateValue: null,
      unit: "days",
      unitPosition: "after",
      unitSpacing: "space",
      precision: 1,
    })
    expect(page.interpretations).toEqual([""])
  })

  it("lists missing metric values after title and verdict", () => {
    const issues = assessContentReadiness(
      createBlankEvidenceDecisionPage("p01")
    )
    expect(issues.map((issue) => issue.path)).toEqual([
      "title",
      "verdict",
      "metrics[0].label",
      "metrics[0].baselineValue",
      "metrics[0].candidateValue",
      "metrics[1].label",
      "metrics[1].baselineValue",
      "metrics[1].candidateValue",
      "interpretations[0]",
      "interpretations[1]",
    ])
  })

  it("treats nonempty invalid Metric Input as invalid-content", () => {
    const page = createBlankEvidenceDecisionPage("p01")
    const metricInput = { p01: { "metrics[0].baselineValue": "abc" } }
    const baselineIssues = assessContentReadiness(page, { metricInput }).filter(
      (issue) => issue.path === "metrics[0].baselineValue"
    )
    expect(baselineIssues).toEqual([
      {
        code: "invalid-content",
        path: "metrics[0].baselineValue",
        message: "Metric value must be a finite non-negative number",
      },
    ])
  })
})
