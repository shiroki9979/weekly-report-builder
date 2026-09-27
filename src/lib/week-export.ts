import type { MetricDraftBuffer } from "./metric-draft-buffer"
import type { ExportIssue } from "./export-readiness"
import { exportPage, type CaptureAdapter } from "./export-page-gate"
import type { WeekDocument } from "./week-document"

export type SkippedExportPage = {
  pageId: string
  issues: ExportIssue[]
}

export function exportFileName(monday: string, pageId: string): string {
  return `${monday}-${pageId}.png`
}

export type ExportVisiblePagesDeps = {
  adapter: CaptureAdapter
  download: (blob: Blob, fileName: string) => void
  metricBuffer?: MetricDraftBuffer
}

export async function exportVisiblePages(
  monday: string,
  week: WeekDocument,
  deps: ExportVisiblePagesDeps
): Promise<SkippedExportPage[]> {
  const skipped: SkippedExportPage[] = []

  for (const page of week.pages) {
    if (page.hidden) {
      continue
    }

    const result = await exportPage(week, page, deps.adapter, deps.metricBuffer)
    if (result.kind === "blocked") {
      skipped.push({ pageId: page.id, issues: result.issues })
      continue
    }
    if (result.kind === "failed") {
      throw result.cause
    }
    deps.download(result.blob, exportFileName(monday, page.id))
  }

  return skipped
}

function formatExportIssueReason(issue: ExportIssue): string {
  const reason =
    issue.code === "missing-content"
      ? "Draft Page"
      : issue.code === "overflow"
        ? "Overflowing Page"
        : issue.code === "invalid-content"
          ? "invalid content"
          : issue.code === "measurement-failed"
            ? "measurement failed"
            : "unsupported"

  return issue.path ? `${issue.path} (${reason})` : reason
}

export function formatSkippedExportWarning(
  skipped: SkippedExportPage[]
): string | null {
  if (skipped.length === 0) {
    return null
  }

  const details = skipped
    .map((entry) => {
      const reasons = entry.issues.map(formatExportIssueReason).join(", ")
      return `${entry.pageId}: ${reasons}`
    })
    .join("; ")

  return `Skipped pages: ${details}`
}
