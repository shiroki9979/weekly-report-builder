import type { MetricDraftBuffer } from "./metric-draft-buffer"
import {
  assessExportEligibility,
  type CaptureAssessment,
  type ExportIssue,
} from "./export-readiness"
import {
  isHtmlWeekPage,
  isSupportedStagePage,
  type WeekDocument,
  type WeekPage,
} from "./week-document"

export type SkippedExportPage = {
  pageId: string
  issues: ExportIssue[]
}

export function listExportablePages(week: WeekDocument): WeekPage[] {
  return week.pages.filter((page) => !page.hidden && isSupportedStagePage(page))
}

export function listSkippedPages(week: WeekDocument): WeekPage[] {
  return week.pages.filter(
    (page) => !page.hidden && !isSupportedStagePage(page)
  )
}

export function exportFileName(monday: string, pageId: string): string {
  return `${monday}-${pageId}.png`
}

export type ExportVisiblePagesDeps = {
  capture: (element: HTMLElement) => Promise<Blob>
  download: (blob: Blob, fileName: string) => void
  renderPage: (page: WeekPage) => Promise<HTMLElement>
  measureCapture: (element: HTMLElement) => Promise<CaptureAssessment>
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

    const withoutCapture = assessExportEligibility(
      page,
      undefined,
      deps.metricBuffer
    )
    const blockedBeforeRender = withoutCapture.issues.some(
      (issue) => issue.code !== "measurement-failed"
    )
    if (!withoutCapture.eligible && blockedBeforeRender) {
      skipped.push({ pageId: page.id, issues: withoutCapture.issues })
      continue
    }

    if (isHtmlWeekPage(page)) {
      const element = await deps.renderPage(page)
      const blob = await deps.capture(element)
      deps.download(blob, exportFileName(monday, page.id))
      continue
    }

    const element = await deps.renderPage(page)
    const capture = await deps.measureCapture(element)
    const assessment = assessExportEligibility(page, capture, deps.metricBuffer)
    if (!assessment.eligible) {
      skipped.push({ pageId: page.id, issues: assessment.issues })
      continue
    }

    const blob = await deps.capture(element)
    deps.download(blob, exportFileName(monday, page.id))
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
