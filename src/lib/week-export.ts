import type { MetricDraftBuffer } from "./metric-draft-buffer"
import { formatExportIssues, type ExportIssue } from "./export-readiness"
import { exportPage, type CaptureAdapter } from "./export-page-gate"
import type { WeekDocument } from "./week-document"

export type SkippedExportPage = {
  pageId: string
  issues: ExportIssue[]
}

export type BatchExportResult = {
  monday: string
  selected: number
  downloadsTriggered: number
  skipped: SkippedExportPage[]
  failed: { pageId: string; reason: string } | null
  notAttempted: number
  stopReason: string | null
}

export function exportFileName(monday: string, pageId: string): string {
  return `${monday}-${pageId}.png`
}

export type ExportVisiblePagesDeps = {
  adapter: CaptureAdapter
  download: (blob: Blob, fileName: string) => void
  metricBuffer?: MetricDraftBuffer
  signal?: AbortSignal
  beforePages?: () => void
}

export async function exportVisiblePages(
  monday: string,
  week: WeekDocument,
  deps: ExportVisiblePagesDeps
): Promise<BatchExportResult> {
  const pages = week.pages.filter((page) => !page.hidden)
  const outcome: BatchExportResult = {
    monday,
    selected: pages.length,
    downloadsTriggered: 0,
    skipped: [],
    failed: null,
    notAttempted: pages.length,
    stopReason: null,
  }

  try {
    deps.beforePages?.()
  } catch (cause: unknown) {
    outcome.stopReason = errorMessage(cause)
    return outcome
  }

  for (const page of pages) {
    if (deps.signal?.aborted) {
      break
    }

    let result
    try {
      result = await exportPage(
        week,
        page,
        deps.adapter,
        deps.metricBuffer,
        deps.signal
      )
    } catch (cause: unknown) {
      outcome.failed = { pageId: page.id, reason: errorMessage(cause) }
      outcome.stopReason = outcome.failed.reason
      outcome.notAttempted--
      break
    }
    if (deps.signal?.aborted) {
      break
    }
    if (result.kind === "blocked") {
      outcome.skipped.push({ pageId: page.id, issues: result.issues })
      outcome.notAttempted--
      continue
    }
    if (result.kind === "failed") {
      outcome.failed = { pageId: page.id, reason: errorMessage(result.cause) }
      outcome.stopReason = outcome.failed.reason
      outcome.notAttempted--
      break
    }
    try {
      deps.download(result.blob, exportFileName(monday, page.id))
      outcome.downloadsTriggered++
    } catch (cause: unknown) {
      outcome.failed = { pageId: page.id, reason: errorMessage(cause) }
      outcome.stopReason = outcome.failed.reason
    }
    outcome.notAttempted--
    if (outcome.failed) break
  }

  return outcome
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : "Export failed"
}

export function formatBatchExportResult(result: BatchExportResult): string {
  const summary = `Export for ${result.monday}: Downloads triggered: ${result.downloadsTriggered}; Skipped: ${result.skipped.length}; Failed: ${result.failed ? 1 : 0}; Not attempted: ${result.notAttempted}.`
  const skipped = formatSkippedExportWarning(result.skipped)
  const details = [
    skipped,
    result.failed
      ? `Failed page: ${result.failed.pageId}: ${result.failed.reason}`
      : null,
    result.stopReason && !result.failed
      ? `Stopped: ${result.stopReason}`
      : null,
  ].filter(Boolean)
  return details.length ? `${summary} ${details.join("; ")}` : summary
}

export function formatSkippedExportWarning(
  skipped: SkippedExportPage[]
): string | null {
  if (skipped.length === 0) {
    return null
  }

  const details = skipped
    .map((entry) => {
      const reasons = formatExportIssues(entry.issues)
      return `${entry.pageId}: ${reasons}`
    })
    .join("; ")

  return `Skipped pages: ${details}`
}
