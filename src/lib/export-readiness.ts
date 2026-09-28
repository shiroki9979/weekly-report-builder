import {
  CARDINALITY,
  hasValidMetricFormat,
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
import { errorMessage } from "./error-message"
import { isTrendDirection, trendBounds, trendEndMonday } from "./trend-target"
import { isCalendarMonday } from "./week-id"
import {
  observationPath,
  trendInputError,
  trendRangeError,
} from "./trend-input"

import {
  invalidMetricInputMessage,
  METRIC_VALUE_FIELDS,
  metricInputPath,
  type MetricInputLocation,
  type MetricInputMap,
  type MetricValueField,
  type TrendInputPath,
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

// 少於兩個量測點畫不出趨勢線
const MIN_MEASURED_OBSERVATIONS = 2

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
  return [
    ...trendTextIssues(page),
    ...trendPendingInputIssues(page, inputs),
    ...trendDateIssues(page, reportingMonday),
    ...trendTargetIssues(page),
    ...trendFormatIssues(page),
    ...trendObservationIssues(page),
    ...trendAxisIssues(page),
  ]
}

function trendTextIssues(page: TrendTargetPage): ExportIssue[] {
  const fields = [
    ["title", page.title, "Title"],
    ["metric.label", page.metric.label, "Metric label"],
    ["interpretation", page.interpretation, "Interpretation"],
    ["measurementContext", page.measurementContext, "Measurement Context"],
  ] as const
  return fields.flatMap(([path, value, label]) =>
    isBlank(value) ? [missing(path, `${label} is required`)] : []
  )
}

function trendPendingInputIssues(
  page: TrendTargetPage,
  inputs: MetricInputMap
): ExportIssue[] {
  const paths: TrendInputPath[] = [
    "startMonday",
    "target",
    ...page.observations.map((_, index) => observationPath(index)),
  ]
  return paths.flatMap((path) => {
    const message = trendInputError(page, inputs, path)
    return message ? [invalid(path, message)] : []
  })
}

function trendDateIssues(
  page: TrendTargetPage,
  reportingMonday?: string
): ExportIssue[] {
  if (!page.startMonday)
    return [missing("startMonday", "Starting Monday is required")]
  if (!isCalendarMonday(page.startMonday))
    return [
      invalid("startMonday", "Starting Monday must be a real calendar Monday"),
    ]
  const rangeError = trendRangeError(page.startMonday, page.observations.length)
  if (rangeError) return [invalid("observations", rangeError)]
  if (!reportingMonday || !isCalendarMonday(reportingMonday))
    return [invalid("observations", "Reporting Monday is unavailable")]
  const end = trendEndMonday(page)
  if (end && end > reportingMonday)
    return [
      invalid(
        "observations",
        `Observed range ends ${end}, after reporting week ${reportingMonday}`
      ),
    ]
  return []
}

function trendTargetIssues(page: TrendTargetPage): ExportIssue[] {
  if (page.target === null) return [missing("target", "Target is required")]
  if (!Number.isFinite(page.target))
    return [invalid("target", "Target must be finite")]
  return []
}

function trendFormatIssues(page: TrendTargetPage): ExportIssue[] {
  const issues: ExportIssue[] = []
  if (!hasValidMetricFormat(page.metric))
    issues.push(invalid("metric", "Metric format is invalid"))
  if (!isTrendDirection(page.direction))
    issues.push(invalid("direction", "Target direction is invalid"))
  return issues
}

function trendObservationIssues(page: TrendTargetPage): ExportIssue[] {
  const { min, max } = CARDINALITY.trendObservations
  const issues: ExportIssue[] = []
  if (page.observations.length < min || page.observations.length > max)
    issues.push(
      invalid(
        "observations",
        `Trend requires ${min} to ${max} weekly positions`
      )
    )
  page.observations.forEach((entry, index) => {
    if (entry.state === "unfilled")
      issues.push(missing(`observations[${index}]`, "Observation is unfilled"))
    if (entry.state === "measured" && !Number.isFinite(entry.value))
      issues.push(
        invalid(`observations[${index}].value`, "Measurement must be finite")
      )
  })
  const measured = page.observations.filter(
    (entry) => entry.state === "measured"
  ).length
  if (measured < MIN_MEASURED_OBSERVATIONS)
    issues.push(
      missing("observations", "At least two measured observations are required")
    )
  return issues
}

function trendAxisIssues(page: TrendTargetPage): ExportIssue[] {
  try {
    trendBounds(page)
    return []
  } catch (cause) {
    return [
      invalid(
        "observations",
        errorMessage(cause, "Trend axis calculation failed")
      ),
    ]
  }
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
