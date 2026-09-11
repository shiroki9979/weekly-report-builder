import { describe, expect, it } from "vitest"

import {
  addDecisionInterpretation,
  addDecisionMetric,
  assessMetricDraftIssues,
  metricBufferKey,
  metricDraftPath,
  parseMetricBufferKey,
  remapMetricBufferAfterMove,
  remapMetricBufferAfterRemove,
  removeDecisionInterpretation,
  removeDecisionMetric,
  setDecisionMetricValue,
  weekHasInvalidMetricDrafts,
} from "@/lib/evidence-decision-editor"
import { assessContentReadiness } from "@/lib/export-readiness"
import { createBlankEvidenceDecisionPage } from "@/lib/page-lifecycle"
import { cloneWeekFromPrevious } from "@/lib/week-clone"
import { parseWeekDocument } from "@/lib/week-document"
import type { EvidenceDecisionPage, WeekDocument } from "@/lib/week-document"

function weekWith(page: EvidenceDecisionPage): WeekDocument {
  return { start: "2026-08-24", end: "2026-08-28", pages: [page] }
}

function decision(week: WeekDocument): EvidenceDecisionPage {
  const page = week.pages[0]
  if (page.layout !== "evidence-decision") {
    throw new Error("expected evidence-decision")
  }
  return page
}

describe("evidence-decision schema", () => {
  it("parses a draft with null metric values and strips extra fields", () => {
    const doc = parseWeekDocument({
      start: "2026-08-24",
      end: "2026-08-28",
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
      parseWeekDocument({
        start: "2026-08-24",
        end: "2026-08-28",
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
      parseWeekDocument({
        start: "2026-08-24",
        end: "2026-08-28",
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
      parseWeekDocument({
        start: "2026-08-24",
        end: "2026-08-28",
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
      parseWeekDocument({
        start: "2026-08-24",
        end: "2026-08-28",
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
    const previous = parseWeekDocument({
      start: "2026-08-24",
      end: "2026-08-28",
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
    const cloned = cloneWeekFromPrevious(previous, "2026-08-31")
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

  it("treats nonempty invalid metric drafts as invalid-content", () => {
    const page = createBlankEvidenceDecisionPage("p01")
    const buffer = {
      [metricBufferKey("p01", "metrics[0].baselineValue")]: "abc",
    }
    expect(assessMetricDraftIssues(page, buffer)).toEqual([
      {
        code: "invalid-content",
        path: "metrics[0].baselineValue",
        message: "Metric value must be a finite non-negative number",
      },
    ])
    expect(weekHasInvalidMetricDrafts(weekWith(page), buffer)).toBe(true)
    expect(weekHasInvalidMetricDrafts(weekWith(page), {})).toBe(false)
  })

  it("moves metric draft keys with the metric", () => {
    const pageId = "p01"
    const otherKey = metricBufferKey("p02", "metrics[0].baselineValue")
    const buffer = {
      [metricBufferKey(pageId, "metrics[0].baselineValue")]: "1.0",
      [metricBufferKey(pageId, "metrics[1].candidateValue")]: "abc",
      [otherKey]: "keep",
    }

    expect(remapMetricBufferAfterMove(buffer, pageId, 1, 0)).toEqual({
      [metricBufferKey(pageId, "metrics[0].candidateValue")]: "abc",
      [metricBufferKey(pageId, "metrics[1].baselineValue")]: "1.0",
      [otherKey]: "keep",
    })
  })

  it("shifts metric draft keys after a metric is removed", () => {
    const pageId = "p01"
    const buffer = {
      [metricBufferKey(pageId, "metrics[0].baselineValue")]: "1.0",
      [metricBufferKey(pageId, "metrics[1].baselineValue")]: "abc",
    }

    expect(remapMetricBufferAfterRemove(buffer, pageId, 0)).toEqual({
      [metricBufferKey(pageId, "metrics[0].baselineValue")]: "abc",
    })
  })

  it("parses Comparison Metric draft keys into page id and path", () => {
    const key = metricBufferKey("p01", metricDraftPath(1, "candidateValue"))
    expect(parseMetricBufferKey(key)).toEqual({
      pageId: "p01",
      path: "metrics[1].candidateValue",
    })
    expect(parseMetricBufferKey("p01:title")).toBeNull()
    expect(parseMetricBufferKey("metrics[0].baselineValue")).toBeNull()
  })
})
