import { errorMessage } from "./error-message"
import { formatExportIssues, type ExportIssue } from "./export-readiness"
import {
  exportPage,
  type ExportPageDeps,
  type PageGateResult,
} from "./export-page-gate"
import type { WeekDocument, WeekPage } from "./week-document"

export type SkippedExportPage = {
  pageId: string
  issues: ExportIssue[]
}

export type FailedExportPage = {
  pageId: string
  reason: string
}

export type BatchExportResult = {
  monday: string
  selectedCount: number
  downloadsTriggered: number
  skipped: SkippedExportPage[]
  failed: FailedExportPage | null
  notAttempted: number
  stopReason: string | null
}

export function exportFileName(monday: string, pageId: string): string {
  return `${monday}-${pageId}.png`
}

export type ExportVisiblePagesDeps = ExportPageDeps & {
  download: (blob: Blob, fileName: string) => void
  beforePages?: () => void
}

const EXPORT_FAILED = "Export failed"

type PageOutcome =
  | { kind: "downloaded" }
  | { kind: "skipped"; issues: ExportIssue[] }
  | { kind: "failed"; reason: string }

type BatchRun = {
  monday: string
  week: WeekDocument
  deps: ExportVisiblePagesDeps
}

// 不會 reject：任何失敗都記入結果，已觸發的下載與略過頁面才能完整回報。
export async function exportVisiblePages(
  monday: string,
  week: WeekDocument,
  deps: ExportVisiblePagesDeps
): Promise<BatchExportResult> {
  const pages = week.pages.filter((page) => !page.hidden)
  const outcome: BatchExportResult = {
    monday,
    selectedCount: pages.length,
    downloadsTriggered: 0,
    skipped: [],
    failed: null,
    notAttempted: pages.length,
    stopReason: null,
  }

  try {
    deps.beforePages?.()
  } catch (cause: unknown) {
    outcome.stopReason = errorMessage(cause, EXPORT_FAILED)
    return outcome
  }

  const run: BatchRun = { monday, week, deps }
  for (const page of pages) {
    if (deps.signal?.aborted) break
    const gateResult = await passPageThroughGate(run, page)
    // 截圖完成後操作仍可能已被中止；中止後不得再觸發任何輸出。
    if (deps.signal?.aborted) break
    recordPageOutcome(outcome, page.id, deliverPage(run, page.id, gateResult))
    if (outcome.failed) break
  }

  return outcome
}

async function passPageThroughGate(
  run: BatchRun,
  page: WeekPage
): Promise<PageGateResult> {
  try {
    return await exportPage(run.monday, run.week, page, run.deps)
  } catch (cause: unknown) {
    return { kind: "failed", cause }
  }
}

function deliverPage(
  run: BatchRun,
  pageId: string,
  result: PageGateResult
): PageOutcome {
  if (result.kind === "blocked") {
    return { kind: "skipped", issues: result.issues }
  }
  if (result.kind === "failed") {
    return { kind: "failed", reason: errorMessage(result.cause, EXPORT_FAILED) }
  }
  return triggerDownload(run, pageId, result.blob)
}

function triggerDownload(
  run: BatchRun,
  pageId: string,
  blob: Blob
): PageOutcome {
  try {
    run.deps.download(blob, exportFileName(run.monday, pageId))
    return { kind: "downloaded" }
  } catch (cause: unknown) {
    return {
      kind: "failed",
      reason: `Download trigger failed: ${errorMessage(cause, EXPORT_FAILED)}`,
    }
  }
}

function recordPageOutcome(
  outcome: BatchExportResult,
  pageId: string,
  pageOutcome: PageOutcome
): void {
  outcome.notAttempted--
  if (pageOutcome.kind === "downloaded") {
    outcome.downloadsTriggered++
  } else if (pageOutcome.kind === "skipped") {
    outcome.skipped.push({ pageId, issues: pageOutcome.issues })
  } else {
    outcome.failed = { pageId, reason: pageOutcome.reason }
    outcome.stopReason = pageOutcome.reason
  }
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
