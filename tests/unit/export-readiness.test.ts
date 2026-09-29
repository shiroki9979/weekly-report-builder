import { describe, expect, it } from "vitest"

import {
  assessContentReadiness,
  assessExportEligibility,
} from "@/lib/export-readiness"
import {
  createBlankEvidenceDecisionPage,
  createBlankTwoColumnPage,
  createBlankOverviewPage,
} from "@/lib/page-lifecycle"
import type {
  EvidenceDecisionPage,
  TwoColumnPage,
  UnknownPage,
  OverviewPage,
} from "@/lib/deck"

function completeTablePage(
  overrides: Partial<TwoColumnPage> = {}
): TwoColumnPage {
  return {
    id: "p01",
    layout: "two-column",
    title: "Eval Gate",
    items: [
      { heading: "One", body: "First" },
      { heading: "Two", body: "Second" },
      { heading: "Three", body: "Third" },
    ],
    panel: {
      kind: "table",
      title: "Loaded model",
      columns: ["Action", "Outcome"],
      rows: [{ cells: ["Eval", "Skip"] }],
    },
    ...overrides,
  }
}

function completeDecisionPage(
  overrides: Partial<EvidenceDecisionPage> = {}
): EvidenceDecisionPage {
  return {
    id: "p01",
    layout: "evidence-decision",
    title: "Ship the candidate.",
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
    interpretations: ["The candidate finishes the same week."],
    ...overrides,
  }
}

describe("assessContentReadiness", () => {
  it("returns no issues for a content-complete two-column table page", () => {
    expect(assessContentReadiness(completeTablePage())).toEqual([])
  })

  it("lists missing-content issues in schema declaration order", () => {
    const page = createBlankTwoColumnPage("p01", "table")
    const issues = assessContentReadiness(page)

    expect(issues.map((issue) => issue.path)).toEqual([
      "title",
      "items[0].heading",
      "items[0].body",
      "items[1].heading",
      "items[1].body",
      "items[2].heading",
      "items[2].body",
      "panel.title",
      "panel.columns[0]",
      "panel.rows[0].cells[0]",
    ])
    expect(issues.every((issue) => issue.code === "missing-content")).toBe(true)
  })

  it("lists overview missing-content issues in schema declaration order", () => {
    const issues = assessContentReadiness(createBlankOverviewPage("p01"))

    expect(issues.map((issue) => issue.path)).toEqual([
      "title",
      "lead.workstream",
      "lead.figure",
      "lead.result",
      "lead.impact",
      "lead.status.label",
      "supporting[0].workstream",
      "supporting[0].figure",
      "supporting[0].result",
      "supporting[0].impact",
      "supporting[0].status.label",
      "supporting[1].workstream",
      "supporting[1].figure",
      "supporting[1].result",
      "supporting[1].impact",
      "supporting[1].status.label",
    ])
  })

  it("treats a filled overview with neutral tone as complete", () => {
    const page: OverviewPage = {
      id: "p01",
      layout: "overview",
      title: "Delivery recovered",
      lead: {
        workstream: "Delivery",
        figure: "5 days",
        result: "Turnaround fell",
        impact: "Same week",
        status: { label: "On track", tone: "neutral" },
      },
      supporting: [
        {
          workstream: "Accuracy",
          figure: "1.2%",
          result: "Faults dropped",
          impact: "Fewer late fixes",
          status: { label: "Improved", tone: "neutral" },
        },
      ],
    }

    expect(assessContentReadiness(page)).toEqual([])
  })

  it("reports rectangular table mismatches as invalid-content", () => {
    const page = completeTablePage({
      panel: {
        kind: "table",
        title: "Loaded model",
        columns: ["Action", "Outcome"],
        rows: [{ cells: ["Eval"] }],
      },
    })

    expect(assessContentReadiness(page)).toEqual([
      {
        code: "invalid-content",
        path: "panel.rows[0].cells",
        message: "Row cell count must match the column count",
      },
    ])
  })

  it("reports non-finite or negative chart values as invalid-content", () => {
    const page = completeTablePage({
      panel: {
        kind: "chart",
        title: "Commits",
        categories: ["Mon"],
        series: [{ name: "Platform", values: [-1] }],
      },
    })

    expect(assessContentReadiness(page)).toEqual([
      {
        code: "invalid-content",
        path: "panel.series[0].values[0]",
        message: "Chart values must be finite and non-negative",
      },
    ])
  })

  it("reports a chart series that is not aligned to categories", () => {
    const page = completeTablePage({
      panel: {
        kind: "chart",
        title: "Commits",
        categories: ["Mon", "Tue"],
        series: [{ name: "Platform", values: [1] }],
      },
    })

    expect(assessContentReadiness(page)).toEqual([
      {
        code: "invalid-content",
        path: "panel.series[0].values",
        message: "Series values must align with categories",
      },
    ])
  })
})

describe("assessExportEligibility", () => {
  it("marks unknown layouts and fields panels as unsupported", () => {
    const unknown: UnknownPage = {
      id: "p04",
      layout: "future-layout",
      title: "Future",
    }
    const fieldsPage: TwoColumnPage = completeTablePage({
      panel: { kind: "fields", title: "Meta", rows: [] },
    })

    expect(assessExportEligibility(unknown)).toEqual({
      eligible: false,
      issues: [
        {
          code: "unsupported",
          message: "This layout cannot be exported",
        },
      ],
    })
    expect(assessExportEligibility(fieldsPage).issues[0]?.code).toBe(
      "unsupported"
    )
  })

  it("lets HTML pages through without structured completeness or overflow gates", () => {
    expect(
      assessExportEligibility({
        id: "p03",
        layout: "html",
        title: "",
        htmlFile: "p03.html",
      })
    ).toEqual({ eligible: true, issues: [] })
  })

  it("returns content issues without requiring capture", () => {
    const assessment = assessExportEligibility(
      createBlankTwoColumnPage("p01", "table")
    )

    expect(assessment.eligible).toBe(false)
    expect(assessment.issues[0]?.code).toBe("missing-content")
    expect(
      assessment.issues.some(
        (issue) =>
          issue.code === "overflow" || issue.code === "measurement-failed"
      )
    ).toBe(false)
  })

  it("fails closed when a content-complete structured page has no capture assessment", () => {
    expect(assessExportEligibility(completeTablePage())).toEqual({
      eligible: false,
      issues: [
        {
          code: "measurement-failed",
          message: "Capture measurement was not provided",
        },
      ],
    })
  })

  it("treats overflow and measurement failure as ineligible after content passes", () => {
    expect(
      assessExportEligibility(completeTablePage(), {
        status: "overflow",
        axes: ["vertical"],
      }).issues
    ).toEqual([
      {
        code: "overflow",
        message: "Page overflows the 1280 × 720 capture stage vertically",
      },
    ])

    expect(
      assessExportEligibility(completeTablePage(), {
        status: "measurement-failed",
        message: "Timed out waiting for fonts",
      }).issues
    ).toEqual([
      {
        code: "measurement-failed",
        message: "Timed out waiting for fonts",
      },
    ])
  })

  it("is eligible when content is complete and capture fits", () => {
    expect(
      assessExportEligibility(completeTablePage(), { status: "fit" })
    ).toEqual({ eligible: true, issues: [] })
  })

  it("merges invalid Metric Input into content issues without capturing", () => {
    const metricInput = { p01: { "metrics[0].baselineValue": "abc" } }

    expect(
      assessExportEligibility(
        completeDecisionPage(),
        { status: "fit" },
        { metricInput }
      )
    ).toEqual({
      eligible: false,
      issues: [
        {
          code: "invalid-content",
          path: "metrics[0].baselineValue",
          message: "Metric value must be a finite non-negative number",
        },
      ],
    })
  })

  it("keeps schema path order and lets invalid Metric Input win over missing values", () => {
    const metricInput = { p01: { "metrics[0].baselineValue": "abc" } }
    const assessment = assessExportEligibility(
      createBlankEvidenceDecisionPage("p01"),
      undefined,
      { metricInput }
    )

    expect(assessment.issues.map((issue) => [issue.path, issue.code])).toEqual([
      ["title", "missing-content"],
      ["verdict", "missing-content"],
      ["metrics[0].label", "missing-content"],
      ["metrics[0].baselineValue", "invalid-content"],
      ["metrics[0].candidateValue", "missing-content"],
      ["metrics[1].label", "missing-content"],
      ["metrics[1].baselineValue", "missing-content"],
      ["metrics[1].candidateValue", "missing-content"],
      ["interpretations[0]", "missing-content"],
      ["interpretations[1]", "missing-content"],
    ])
  })
})
