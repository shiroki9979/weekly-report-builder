import type { MetricDraftBuffer } from "./metric-draft-buffer"
import {
  assessContentReadiness,
  assessExportEligibility,
  type CaptureAssessment,
  type ExportIssue,
} from "./export-readiness"
import {
  isHtmlWeekPage,
  isStructuredWeekPage,
  isSupportedStagePage,
  type WeekDocument,
  type WeekPage,
} from "./week-document"

export type CaptureSession = {
  measure: () => Promise<CaptureAssessment>
  capture: () => Promise<Blob>
  dispose: () => void
}

export type CaptureAdapter = {
  prepare: (week: WeekDocument, page: WeekPage) => Promise<CaptureSession>
}

export type PageGateResult =
  | { kind: "captured"; blob: Blob }
  | { kind: "blocked"; issues: ExportIssue[] }
  | { kind: "failed"; cause: unknown }

export async function exportPage(
  week: WeekDocument,
  page: WeekPage,
  adapter: CaptureAdapter,
  metricBuffer: MetricDraftBuffer = {}
): Promise<PageGateResult> {
  if (!isSupportedStagePage(page)) {
    return { kind: "blocked", issues: assessExportEligibility(page).issues }
  }

  if (isStructuredWeekPage(page)) {
    const issues = assessContentReadiness(page, metricBuffer)
    if (issues.length > 0) {
      return { kind: "blocked", issues }
    }
  }

  let session: CaptureSession | undefined
  let result: PageGateResult
  try {
    session = await adapter.prepare(week, page)
    const assessment = isHtmlWeekPage(page)
      ? { eligible: true, issues: [] }
      : assessExportEligibility(page, await session.measure(), metricBuffer)
    if (assessment.eligible) {
      result = { kind: "captured", blob: await session.capture() }
    } else {
      result = { kind: "blocked", issues: assessment.issues }
    }
  } catch (cause: unknown) {
    result = { kind: "failed", cause }
  }
  try {
    session?.dispose()
  } catch (cause: unknown) {
    result = { kind: "failed", cause }
  }
  return result
}
