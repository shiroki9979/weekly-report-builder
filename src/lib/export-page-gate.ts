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
  prepare: (
    week: WeekDocument,
    page: WeekPage,
    signal?: AbortSignal
  ) => Promise<CaptureSession | { kind: "html-load-failed"; message: string }>
}

export type PageGateResult =
  | { kind: "captured"; blob: Blob }
  | { kind: "blocked"; issues: ExportIssue[] }
  | { kind: "failed"; cause: unknown }

const MEASUREMENT_TIMEOUT_MS = 5000
const CAPTURE_TIMEOUT_MS = 15000

function abortError(): DOMException {
  return new DOMException("Export was aborted", "AbortError")
}

function causeMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback
}

async function runPhase<T>(
  run: () => Promise<T>,
  timeoutMs: number | undefined,
  signal?: AbortSignal,
  phase = "Operation"
): Promise<T> {
  if (signal?.aborted) throw abortError()

  let timeout: ReturnType<typeof setTimeout> | undefined
  let onAbort: (() => void) | undefined
  const interruption = new Promise<never>((_resolve, reject) => {
    if (timeoutMs !== undefined) {
      timeout = setTimeout(
        () => reject(new Error(`${phase} timed out after ${timeoutMs} ms`)),
        timeoutMs
      )
    }
    onAbort = () => reject(abortError())
    signal?.addEventListener("abort", onAbort, { once: true })
  })

  try {
    return await Promise.race([run(), interruption])
  } finally {
    if (timeout !== undefined) clearTimeout(timeout)
    if (onAbort) signal?.removeEventListener("abort", onAbort)
  }
}

export async function exportPage(
  week: WeekDocument,
  page: WeekPage,
  adapter: CaptureAdapter,
  metricBuffer: MetricDraftBuffer = {},
  signal?: AbortSignal
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

  try {
    const prepared = await runPhase(
      () => adapter.prepare(week, page, signal),
      undefined,
      signal
    )
    if ("kind" in prepared) {
      return {
        kind: "blocked",
        issues: [{ code: "html-load-failed", message: prepared.message }],
      }
    }
    const session = prepared
    try {
      if (!isHtmlWeekPage(page)) {
        let measurement: CaptureAssessment
        try {
          measurement = await runPhase(
            () => session.measure(),
            MEASUREMENT_TIMEOUT_MS,
            signal,
            "Capture measurement"
          )
        } catch (cause: unknown) {
          if (signal?.aborted) throw cause
          return {
            kind: "blocked",
            issues: [
              {
                code: "measurement-failed",
                message: causeMessage(cause, "Capture measurement failed"),
              },
            ],
          }
        }
        const assessment = assessExportEligibility(
          page,
          measurement,
          metricBuffer
        )
        if (!assessment.eligible) {
          return { kind: "blocked", issues: assessment.issues }
        }
      }

      try {
        return {
          kind: "captured",
          blob: await runPhase(
            () => session.capture(),
            CAPTURE_TIMEOUT_MS,
            signal,
            "PNG generation"
          ),
        }
      } catch (cause: unknown) {
        if (signal?.aborted) throw cause
        return {
          kind: "blocked",
          issues: [
            {
              code: "capture-failed",
              message: causeMessage(cause, "PNG generation failed"),
            },
          ],
        }
      }
    } finally {
      session.dispose()
    }
  } catch (cause: unknown) {
    return { kind: "failed", cause }
  }
}
