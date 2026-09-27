import {
  isFiniteNonNegative,
  isHtmlWeekPage,
  isStructuredWeekPage,
  isSupportedStagePage,
  matchWeekPage,
  type ChartPanel,
  type ChecklistPanel,
  type FlowPanel,
  type EvidenceDecisionPage,
  type NextActionsPage,
  type TrendTargetPage,
  type Outcome,
  type StructuredWeekPage,
  type TablePanel,
  type TwoColumnWeekPage,
  type WeekPage,
  type WeeklyOverviewPage,
} from "./week-document"
import { isCalendarMonday, trendBounds, trendEndMonday } from "./trend-target"
import { trendInputError } from "./trend-input"

import {
  invalidMetricInputMessage,
  METRIC_VALUE_FIELDS,
  metricInputPath,
  type MetricInputLocation,
  type MetricInputMap,
  type MetricValueField,
} from "./metric-input"
import {
  CAPTURE_STAGE_SIZE_LABEL,
  type OverflowMeasurement,
} from "./overflow-measurement"

export type ExportIssueCode =
  | "unsupported"
  | "missing-content"
  | "invalid-content"
  | "overflow"
  | "html-load-failed"
  | "measurement-failed"
  | "capture-failed"

export type ExportIssue = {
  code: ExportIssueCode
  path?: string
  message: string
}

export type CaptureAssessment = OverflowMeasurement

export type ExportAssessment = {
  eligible: boolean
  issues: ExportIssue[]
}

function missing(path: string, message: string): ExportIssue {
  return { code: "missing-content", path, message }
}

function invalid(path: string, message: string): ExportIssue {
  return { code: "invalid-content", path, message }
}

function isBlank(value: string): boolean {
  return value.trim() === ""
}

function assessTable(panel: TablePanel): ExportIssue[] {
  const issues: ExportIssue[] = []

  if (panel.columns.length === 0) {
    issues.push(missing("panel.columns", "Table requires at least one column"))
  }

  panel.columns.forEach((column, index) => {
    if (isBlank(column)) {
      issues.push(
        missing(`panel.columns[${index}]`, "Column label is required")
      )
    }
  })

  if (panel.rows.length === 0) {
    issues.push(missing("panel.rows", "Table requires at least one row"))
  }

  panel.rows.forEach((row, rowIndex) => {
    if (row.cells.length !== panel.columns.length) {
      issues.push(
        invalid(
          `panel.rows[${rowIndex}].cells`,
          "Row cell count must match the column count"
        )
      )
      return
    }

    row.cells.forEach((cell, cellIndex) => {
      if (isBlank(cell)) {
        issues.push(
          missing(
            `panel.rows[${rowIndex}].cells[${cellIndex}]`,
            "Table cell is required"
          )
        )
      }
    })
  })

  return issues
}

function assessChart(panel: ChartPanel): ExportIssue[] {
  const issues: ExportIssue[] = []

  if (panel.categories.length === 0) {
    issues.push(
      missing("panel.categories", "Chart requires at least one category")
    )
  }

  panel.categories.forEach((category, index) => {
    if (isBlank(category)) {
      issues.push(
        missing(`panel.categories[${index}]`, "Category label is required")
      )
    }
  })

  if (panel.series.length === 0) {
    issues.push(missing("panel.series", "Chart requires at least one series"))
  }

  panel.series.forEach((series, seriesIndex) => {
    if (isBlank(series.name)) {
      issues.push(
        missing(`panel.series[${seriesIndex}].name`, "Series name is required")
      )
    }

    if (series.values.length !== panel.categories.length) {
      issues.push(
        invalid(
          `panel.series[${seriesIndex}].values`,
          "Series values must align with categories"
        )
      )
      return
    }

    series.values.forEach((value, valueIndex) => {
      if (!isFiniteNonNegative(value)) {
        issues.push(
          invalid(
            `panel.series[${seriesIndex}].values[${valueIndex}]`,
            "Chart values must be finite and non-negative"
          )
        )
      }
    })
  })

  return issues
}

function assessFlow(panel: FlowPanel): ExportIssue[] {
  if (panel.steps.length === 0) {
    return [missing("panel.steps", "Flow requires at least one step")]
  }

  return panel.steps.flatMap((step, index) =>
    isBlank(step.label)
      ? [missing(`panel.steps[${index}].label`, "Step label is required")]
      : []
  )
}

function assessChecklist(panel: ChecklistPanel): ExportIssue[] {
  if (panel.items.length === 0) {
    return [missing("panel.items", "Checklist requires at least one item")]
  }

  return panel.items.flatMap((item, index) =>
    isBlank(item.label)
      ? [missing(`panel.items[${index}].label`, "Checklist item is required")]
      : []
  )
}

function assessTwoColumn(page: TwoColumnWeekPage): ExportIssue[] {
  const issues: ExportIssue[] = []

  if (isBlank(page.title)) {
    issues.push(missing("title", "Title is required"))
  }

  page.items.forEach((item, index) => {
    if (isBlank(item.heading)) {
      issues.push(
        missing(`items[${index}].heading`, "Item heading is required")
      )
    }
    if (isBlank(item.body)) {
      issues.push(missing(`items[${index}].body`, "Item body is required"))
    }
  })

  if (isBlank(page.panel.title)) {
    issues.push(missing("panel.title", "Panel title is required"))
  }

  switch (page.panel.kind) {
    case "table":
      issues.push(...assessTable(page.panel))
      break
    case "chart":
      issues.push(...assessChart(page.panel))
      break
    case "flow":
      issues.push(...assessFlow(page.panel))
      break
    case "checklist":
      issues.push(...assessChecklist(page.panel))
      break
    case "fields":
      break
  }

  return issues
}

function requireOutcomeText(outcome: Outcome, prefix: string): ExportIssue[] {
  const issues: ExportIssue[] = []
  const fields = [
    ["workstream", outcome.workstream, "Workstream is required"],
    ["figure", outcome.figure, "Figure is required"],
    ["result", outcome.result, "Result is required"],
    ["impact", outcome.impact, "Impact is required"],
    ["status.label", outcome.status.label, "Status label is required"],
  ] as const

  for (const [path, value, message] of fields) {
    if (isBlank(value)) {
      issues.push(missing(`${prefix}.${path}`, message))
    }
  }

  return issues
}

function assessWeeklyOverview(page: WeeklyOverviewPage): ExportIssue[] {
  const issues: ExportIssue[] = []

  if (isBlank(page.title)) {
    issues.push(missing("title", "Title is required"))
  }

  issues.push(...requireOutcomeText(page.lead, "lead"))
  page.supporting.forEach((outcome, index) => {
    issues.push(...requireOutcomeText(outcome, `supporting[${index}]`))
  })

  return issues
}

const METRIC_VALUE_LABELS: Record<MetricValueField, string> = {
  baselineValue: "Baseline value",
  candidateValue: "Candidate value",
}

// 非法 Metric Input 優先於 typed 值：輸入未能寫回 JSON，typed 值只是上一個合法值
function assessMetricValue(
  page: EvidenceDecisionPage,
  location: MetricInputLocation,
  metricInput: MetricInputMap
): ExportIssue[] {
  const { metricIndex, field } = location
  const path = metricInputPath(metricIndex, field)
  const inputMessage = invalidMetricInputMessage(metricInput, location)
  if (inputMessage !== null) {
    return [invalid(path, inputMessage)]
  }

  const value = page.metrics[metricIndex][field]
  const label = METRIC_VALUE_LABELS[field]
  if (value === null) {
    return [missing(path, `${label} is required`)]
  }
  if (!isFiniteNonNegative(value)) {
    return [invalid(path, `${label} must be a finite non-negative number`)]
  }
  return []
}

function assessEvidenceDecision(
  page: EvidenceDecisionPage,
  metricInput: MetricInputMap
): ExportIssue[] {
  const issues: ExportIssue[] = []

  if (isBlank(page.title)) {
    issues.push(missing("title", "Title is required"))
  }
  if (isBlank(page.verdict)) {
    issues.push(missing("verdict", "Verdict is required"))
  }

  page.metrics.forEach((metric, index) => {
    if (isBlank(metric.label)) {
      issues.push(
        missing(`metrics[${index}].label`, "Metric label is required")
      )
    }
    issues.push(
      ...METRIC_VALUE_FIELDS.flatMap((field) =>
        assessMetricValue(
          page,
          { pageId: page.id, metricIndex: index, field },
          metricInput
        )
      )
    )
  })

  page.interpretations.forEach((text, index) => {
    if (isBlank(text)) {
      issues.push(
        missing(`interpretations[${index}]`, "Interpretation is required")
      )
    }
  })

  return issues
}

function assessNextActions(page: NextActionsPage): ExportIssue[] {
  const issues: ExportIssue[] = []

  if (isBlank(page.title)) {
    issues.push(missing("title", "Title is required"))
  }

  page.commitments.forEach((commitment, index) => {
    if (isBlank(commitment.title)) {
      issues.push(
        missing(`commitments[${index}].title`, "Commitment title is required")
      )
    }
    if (isBlank(commitment.outcome)) {
      issues.push(
        missing(`commitments[${index}].outcome`, "Outcome is required")
      )
    }
    if (isBlank(commitment.checkpoint)) {
      issues.push(
        missing(`commitments[${index}].checkpoint`, "Checkpoint is required")
      )
    }
  })

  return issues
}

function assessTrendTarget(
  page: TrendTargetPage,
  inputs: MetricInputMap,
  reportingMonday?: string
): ExportIssue[] {
  const issues: ExportIssue[] = []
  for (const [path, value, label] of [
    ["title", page.title, "Title"],
    ["metric.label", page.metric.label, "Metric label"],
    ["interpretation", page.interpretation, "Interpretation"],
    ["measurementContext", page.measurementContext, "Measurement Context"],
  ] as const) {
    if (isBlank(value)) issues.push(missing(path, `${label} is required`))
  }
  for (const path of [
    "startMonday",
    "target",
    ...page.observations.map(
      (_, index) => `observations[${index}].value` as const
    ),
  ] as const) {
    const message = trendInputError(page, inputs, path)
    if (message) issues.push(invalid(path, message))
  }
  if (!page.startMonday)
    issues.push(missing("startMonday", "Starting Monday is required"))
  else if (!isCalendarMonday(page.startMonday))
    issues.push(
      invalid("startMonday", "Starting Monday must be a real calendar Monday")
    )
  else {
    try {
      const end = trendEndMonday(page)
      if (!reportingMonday || !isCalendarMonday(reportingMonday))
        issues.push(invalid("observations", "Reporting Monday is unavailable"))
      else if (end && end > reportingMonday)
        issues.push(
          invalid(
            "observations",
            `Observed range ends ${end}, after reporting week ${reportingMonday}`
          )
        )
    } catch {
      issues.push(
        invalid("observations", "Trend range exceeds supported ISO dates")
      )
    }
  }
  if (page.target === null) issues.push(missing("target", "Target is required"))
  else if (!Number.isFinite(page.target))
    issues.push(invalid("target", "Target must be finite"))
  if (
    ![0, 1, 2].includes(page.metric.precision) ||
    !["before", "after"].includes(page.metric.unitPosition) ||
    !["none", "space"].includes(page.metric.unitSpacing)
  )
    issues.push(invalid("metric", "Metric format is invalid"))
  if (page.direction !== "at-most" && page.direction !== "at-least")
    issues.push(invalid("direction", "Target direction is invalid"))
  if (page.observations.length < 2 || page.observations.length > 12)
    issues.push(
      invalid("observations", "Trend requires 2 to 12 weekly positions")
    )
  let measured = 0
  page.observations.forEach((entry, index) => {
    if (entry.state === "unfilled")
      issues.push(missing(`observations[${index}]`, "Observation is unfilled"))
    if (entry.state === "missing")
      issues.push(
        invalid(
          `observations[${index}]`,
          "Missing observations are available in a later update"
        )
      )
    if (entry.state === "measured") {
      measured++
      if (!Number.isFinite(entry.value))
        issues.push(
          invalid(`observations[${index}].value`, "Measurement must be finite")
        )
    }
  })
  if (measured < 2)
    issues.push(
      missing("observations", "At least two measured observations are required")
    )
  try {
    trendBounds(page)
  } catch (cause) {
    issues.push(
      invalid(
        "observations",
        cause instanceof Error ? cause.message : "Trend axis calculation failed"
      )
    )
  }
  return issues
}

// issue 依各版面 schema 宣告序逐欄產生，呼叫端可直接依序顯示
export function assessContentReadiness(
  page: StructuredWeekPage,
  metricInput: MetricInputMap = {},
  reportingMonday?: string
): ExportIssue[] {
  return matchWeekPage(page, {
    twoColumn: assessTwoColumn,
    weeklyOverview: assessWeeklyOverview,
    evidenceDecision: (decision) =>
      assessEvidenceDecision(decision, metricInput),
    nextActions: assessNextActions,
    trendTarget: (trend) =>
      assessTrendTarget(trend, metricInput, reportingMonday),
    html: () => [],
    unknown: () => [],
  })
}

function overflowMessage(axes: ("horizontal" | "vertical")[]): string {
  const labels = axes.map((axis) =>
    axis === "horizontal" ? "horizontally" : "vertically"
  )
  return `Page overflows the ${CAPTURE_STAGE_SIZE_LABEL} capture stage ${labels.join(" and ")}`
}

export function assessExportEligibility(
  page: WeekPage,
  capture?: CaptureAssessment,
  metricInput: MetricInputMap = {},
  reportingMonday?: string
): ExportAssessment {
  if (isHtmlWeekPage(page)) {
    return { eligible: true, issues: [] }
  }

  if (!isSupportedStagePage(page) || !isStructuredWeekPage(page)) {
    return {
      eligible: false,
      issues: [
        {
          code: "unsupported",
          message: "This layout cannot be exported",
        },
      ],
    }
  }

  const contentIssues = assessContentReadiness(
    page,
    metricInput,
    reportingMonday
  )
  if (contentIssues.length > 0) {
    return { eligible: false, issues: contentIssues }
  }

  if (!capture) {
    return {
      eligible: false,
      issues: [
        {
          code: "measurement-failed",
          message: "Capture measurement was not provided",
        },
      ],
    }
  }

  if (capture.status === "overflow") {
    return {
      eligible: false,
      issues: [
        {
          code: "overflow",
          message: overflowMessage(capture.axes),
        },
      ],
    }
  }

  if (capture.status === "measurement-failed") {
    return {
      eligible: false,
      issues: [
        {
          code: "measurement-failed",
          message: capture.message,
        },
      ],
    }
  }

  return { eligible: true, issues: [] }
}

export function formatExportIssue(issue: ExportIssue): string {
  return issue.path ? `${issue.path}: ${issue.message}` : issue.message
}

export function formatExportIssues(issues: ExportIssue[]): string {
  return issues.map(formatExportIssue).join("; ")
}

export function issuePathsFor(page: WeekPage): Set<string> {
  return issuePaths(
    isStructuredWeekPage(page) ? assessContentReadiness(page) : []
  )
}

export function issuePaths(issues: ExportIssue[]): Set<string> {
  return new Set(issues.flatMap((issue) => (issue.path ? [issue.path] : [])))
}
