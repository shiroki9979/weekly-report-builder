import type { ExportIssue } from "./export-readiness"

const COMPARISON_METRIC_PATH_PREFIX = "metrics["

// Comparison Metric 只屬於 Evidence-backed Decision；Two-column chart 等其他非法值不可借用此術語
function invalidContentLabel(invalidIssues: ExportIssue[]): string {
  const onlyMetrics = invalidIssues.every((issue) =>
    issue.path?.startsWith(COMPARISON_METRIC_PATH_PREFIX)
  )
  return onlyMetrics ? "invalid Comparison Metric input" : "invalid content"
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function contentReadinessHeading(issues: ExportIssue[]): string {
  const hasMissing = issues.some((issue) => issue.code === "missing-content")
  const invalidIssues = issues.filter(
    (issue) => issue.code === "invalid-content"
  )
  if (hasMissing && invalidIssues.length > 0) {
    return `Draft Page — missing required content; ${invalidContentLabel(invalidIssues)}`
  }
  if (hasMissing) {
    return "Draft Page — missing required content"
  }
  if (invalidIssues.length > 0) {
    return capitalize(invalidContentLabel(invalidIssues))
  }
  return "Not ready to export"
}
