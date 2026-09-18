import type { ExportIssue } from "./export-readiness"

export function contentReadinessHeading(issues: ExportIssue[]): string {
  const hasMissing = issues.some((issue) => issue.code === "missing-content")
  const hasInvalid = issues.some((issue) => issue.code === "invalid-content")
  if (hasMissing && hasInvalid) {
    return "Draft Page — missing required content; invalid Comparison Metric input"
  }
  if (hasMissing) {
    return "Draft Page — missing required content"
  }
  if (hasInvalid) {
    return "Invalid Comparison Metric input"
  }
  return "Not ready to export"
}
