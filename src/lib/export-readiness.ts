import {
  isFiniteNonNegative,
  isHtmlWeekPage,
  isStructuredWeekPage,
  isSupportedStagePage,
  isTwoColumnWeekPage,
  type ChartPanel,
  type ChecklistPanel,
  type FlowPanel,
  type StructuredWeekPage,
  type TablePanel,
  type TwoColumnWeekPage,
  type WeekPage,
} from "./week-document"

import type { OverflowMeasurement } from "./overflow-measurement"

export type ExportIssueCode =
  | "unsupported"
  | "missing-content"
  | "invalid-content"
  | "overflow"
  | "measurement-failed"

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

export function assessContentReadiness(
  page: StructuredWeekPage
): ExportIssue[] {
  if (isTwoColumnWeekPage(page)) {
    return assessTwoColumn(page)
  }

  return []
}

function overflowMessage(axes: ("horizontal" | "vertical")[]): string {
  const labels = axes.map((axis) =>
    axis === "horizontal" ? "horizontally" : "vertically"
  )
  return `Page overflows the 1280 × 720 capture stage ${labels.join(" and ")}`
}

export function assessExportEligibility(
  page: WeekPage,
  capture?: CaptureAssessment
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

  const contentIssues = assessContentReadiness(page)
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

export function formatExportIssues(issues: ExportIssue[]): string {
  return issues
    .map((issue) =>
      issue.path ? `${issue.path}: ${issue.message}` : issue.message
    )
    .join("; ")
}

export function issuePathsFor(page: WeekPage): Set<string> {
  if (!isStructuredWeekPage(page)) {
    return new Set()
  }

  return new Set(
    assessContentReadiness(page)
      .map((issue) => issue.path)
      .filter((path): path is string => path !== undefined)
  )
}
