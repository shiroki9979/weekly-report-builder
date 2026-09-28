import { errorMessage } from "./error-message"
import { abortError } from "./export-errors"
import { PREPARATION_TIMEOUT_MS } from "./capture-limits"
import type { MetricInputMap } from "./metric-input"
import {
  assessContentReadiness,
  assessExportEligibility,
  type CaptureAssessment,
  type ExportIssue,
  type ReadinessContext,
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

export type HtmlLoadFailure = { kind: "html-load-failed"; message: string }

export type PreparedCapture = CaptureSession | HtmlLoadFailure

export type CaptureAdapter = {
  prepare: (
    week: WeekDocument,
    page: WeekPage,
    signal?: AbortSignal
  ) => Promise<PreparedCapture>
}

export type ExportPageDeps = {
  adapter: CaptureAdapter
  metricInput?: MetricInputMap
  signal?: AbortSignal
}

export type PageGateResult =
  | { kind: "captured"; blob: Blob }
  | { kind: "blocked"; issues: ExportIssue[] }
  | { kind: "failed"; cause: unknown }

// 同一頁的 preflight 與量測後判定須用同一份 Metric Input 與報告週一，在入口組好一次
type GateDeps = ExportPageDeps & { readiness: ReadinessContext }

type PhaseLimit = { phase: string; timeoutMs: number }

const MEASUREMENT_LIMIT: PhaseLimit = {
  phase: "Capture measurement",
  timeoutMs: 5000,
}
const CAPTURE_LIMIT: PhaseLimit = { phase: "PNG generation", timeoutMs: 15000 }
const PREPARATION_LIMIT: PhaseLimit = {
  phase: "Capture preparation",
  timeoutMs: PREPARATION_TIMEOUT_MS,
}

export function isHtmlLoadFailure(
  prepared: PreparedCapture
): prepared is HtmlLoadFailure {
  return "kind" in prepared && prepared.kind === "html-load-failed"
}

export async function exportPage(
  week: WeekDocument,
  page: WeekPage,
  deps: ExportPageDeps
): Promise<PageGateResult> {
  if (deps.signal?.aborted) {
    return { kind: "failed", cause: deps.signal.reason }
  }
  const gateDeps: GateDeps = {
    ...deps,
    readiness: { metricInput: deps.metricInput, reportingMonday: week.start },
  }
  const readinessIssues = preflightIssues(page, gateDeps.readiness)
  if (readinessIssues.length > 0) {
    return { kind: "blocked", issues: readinessIssues }
  }

  try {
    const prepared = await prepareSession(week, page, gateDeps)
    if (isHtmlLoadFailure(prepared)) {
      return {
        kind: "blocked",
        issues: [{ code: "html-load-failed", message: prepared.message }],
      }
    }
    return await captureFromSession(prepared, page, gateDeps)
  } catch (cause: unknown) {
    return { kind: "failed", cause }
  }
}

function preflightIssues(
  page: WeekPage,
  readiness: ReadinessContext
): ExportIssue[] {
  if (!isSupportedStagePage(page)) {
    return assessExportEligibility(page).issues
  }
  if (isStructuredWeekPage(page)) {
    return assessContentReadiness(page, readiness)
  }
  return []
}

async function prepareSession(
  week: WeekDocument,
  page: WeekPage,
  deps: GateDeps
): Promise<PreparedCapture> {
  const pending = deps.adapter.prepare(week, page, deps.signal)
  let accepted = false
  try {
    const prepared = await runPhase(
      () => pending,
      PREPARATION_LIMIT,
      deps.signal
    )
    accepted = true
    return prepared
  } finally {
    if (!accepted) disposeLateSession(pending, page)
  }
}

function disposeLateSession(
  pending: Promise<PreparedCapture>,
  page: WeekPage
): void {
  // 逾時或中止已回報為操作失敗；遲到的 session 需清理且不得進入後續頁面。
  // 遲到的錯誤不再影響結果，但仍留下紀錄供除錯。
  void pending
    .then((late) => {
      if (!isHtmlLoadFailure(late)) late.dispose()
    })
    .catch((cause: unknown) => {
      console.warn(`Discarded late capture preparation for ${page.id}`, cause)
    })
}

async function captureFromSession(
  session: CaptureSession,
  page: WeekPage,
  deps: GateDeps
): Promise<PageGateResult> {
  try {
    const issues = await measurementIssues(session, page, deps)
    if (issues.length > 0) {
      return { kind: "blocked", issues }
    }
    return await capturePng(session, deps.signal)
  } finally {
    session.dispose()
  }
}

async function measurementIssues(
  session: CaptureSession,
  page: WeekPage,
  deps: GateDeps
): Promise<ExportIssue[]> {
  if (isHtmlWeekPage(page)) {
    return []
  }

  let measurement: CaptureAssessment
  try {
    measurement = await runPhase(
      () => session.measure(),
      MEASUREMENT_LIMIT,
      deps.signal
    )
  } catch (cause: unknown) {
    if (deps.signal?.aborted) throw cause
    return [
      {
        code: "measurement-failed",
        message: errorMessage(cause, "Capture measurement failed"),
      },
    ]
  }

  const assessment = assessExportEligibility(page, measurement, deps.readiness)
  return assessment.eligible ? [] : assessment.issues
}

async function capturePng(
  session: CaptureSession,
  signal?: AbortSignal
): Promise<PageGateResult> {
  try {
    return {
      kind: "captured",
      blob: await runPhase(() => session.capture(), CAPTURE_LIMIT, signal),
    }
  } catch (cause: unknown) {
    if (signal?.aborted) throw cause
    return {
      kind: "blocked",
      issues: [
        {
          code: "capture-failed",
          message: errorMessage(cause, "PNG generation failed"),
        },
      ],
    }
  }
}

async function runPhase<T>(
  run: () => Promise<T>,
  limit: PhaseLimit,
  signal?: AbortSignal
): Promise<T> {
  if (signal?.aborted) throw abortError()

  let timeout: ReturnType<typeof setTimeout> | undefined
  let onAbort: (() => void) | undefined
  const interruption = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(
      () =>
        reject(
          new Error(`${limit.phase} timed out after ${limit.timeoutMs} ms`)
        ),
      limit.timeoutMs
    )
    onAbort = () => reject(abortError())
    signal?.addEventListener("abort", onAbort, { once: true })
  })

  try {
    return await Promise.race([run(), interruption])
  } finally {
    clearTimeout(timeout)
    if (onAbort) signal?.removeEventListener("abort", onAbort)
  }
}
