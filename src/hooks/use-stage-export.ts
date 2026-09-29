import { useCallback, useEffect, useRef, useState } from "react"

import {
  assertCaptureHostAvailable,
  browserCaptureAdapter,
} from "@/lib/browser-capture-adapter"
import { copyImageToClipboard } from "@/lib/clipboard-image"
import { downloadBlob } from "@/lib/download-blob"
import type { SessionOperationSnapshot } from "@/lib/editing-session"
import { errorMessage } from "@/lib/error-message"
import { exportPage } from "@/lib/export-page-gate"
import { formatExportIssues } from "@/lib/export-readiness"
import { summarizeExportResult, type ExportResult } from "@/lib/export-result"
import type { WeekPage } from "@/lib/week-document"
import { exportVisiblePages } from "@/lib/week-export"

type UseStageExportOptions = {
  operationSnapshot: () => SessionOperationSnapshot | null
}

type ExportCommandResult =
  | { kind: "completed" }
  | { kind: "busy" }
  | { kind: "unavailable" }
  | { kind: "disposed" }

type ExportOperation = {
  snapshot: SessionOperationSnapshot
  controller: AbortController
}

type StartedOperation<Target> = {
  kind: "started"
  operation: ExportOperation
  target: Target
}

export function useStageExport({ operationSnapshot }: UseStageExportOptions) {
  const [exporting, setExporting] = useState(false)
  const [copying, setCopying] = useState(false)
  const [lastResult, setLastResult] = useState<ExportResult | null>(null)
  const activeRef = useRef<ExportOperation | null>(null)
  const disposedRef = useRef(false)

  useEffect(() => {
    disposedRef.current = false
    return () => {
      disposedRef.current = true
      activeRef.current?.controller.abort()
      activeRef.current = null
    }
  }, [])

  // 目標由快照挑出：快照沒有可操作的目標時不佔用互斥鎖，也不清掉上一次結果
  const start = useCallback(
    <Target>(
      pickTarget: (snapshot: SessionOperationSnapshot) => Target | undefined
    ): StartedOperation<Target> | ExportCommandResult => {
      if (disposedRef.current) {
        return { kind: "disposed" }
      }
      if (activeRef.current) {
        return { kind: "busy" }
      }
      const snapshot = operationSnapshot()
      const target = snapshot ? pickTarget(snapshot) : undefined
      if (!snapshot || target === undefined) {
        return { kind: "unavailable" }
      }

      const operation: ExportOperation = {
        snapshot,
        controller: new AbortController(),
      }
      activeRef.current = operation
      setLastResult(null)
      return { kind: "started", operation, target }
    },
    [operationSnapshot]
  )

  const isActive = useCallback(
    (operation: ExportOperation) =>
      activeRef.current === operation && !operation.controller.signal.aborted,
    []
  )

  const finish = useCallback((operation: ExportOperation) => {
    if (activeRef.current === operation) {
      activeRef.current = null
      setExporting(false)
      setCopying(false)
    }
  }, [])

  const downloadVisiblePages =
    useCallback(async (): Promise<ExportCommandResult> => {
      const started = start((snapshot) => snapshot.week)
      if (started.kind !== "started") {
        return started
      }
      const { operation, target: week } = started

      setExporting(true)

      try {
        const result = await exportVisiblePages(
          operation.snapshot.monday,
          week,
          {
            adapter: browserCaptureAdapter,
            download: downloadBlob,
            metricInput: operation.snapshot.metricInput,
            signal: operation.controller.signal,
            beforePages: assertCaptureHostAvailable,
          }
        )
        if (!isActive(operation)) {
          return { kind: "disposed" }
        }
        setLastResult({ kind: "batch", data: result })
      } finally {
        finish(operation)
      }
      return { kind: "completed" }
    }, [finish, isActive, start])

  const copyCurrentPage =
    useCallback(async (): Promise<ExportCommandResult> => {
      const started = start(selectedPage)
      if (started.kind !== "started") {
        return started
      }
      const { operation, target: page } = started

      setCopying(true)

      try {
        const outcome = await copyPageImage(operation, page)
        if (!isActive(operation)) {
          return { kind: "disposed" }
        }
        setLastResult({
          kind: "copy",
          monday: operation.snapshot.monday,
          pageId: page.id,
          error: outcome.kind === "rejected" ? outcome.reason : null,
        })
      } finally {
        finish(operation)
      }
      return { kind: "completed" }
    }, [finish, isActive, start])

  const summary = summarizeExportResult(lastResult)
  return {
    exporting,
    copying,
    exportResult: summary?.message ?? null,
    resultIsError: summary?.isError ?? false,
    downloadVisiblePages,
    copyCurrentPage,
  }
}

function selectedPage(
  snapshot: SessionOperationSnapshot
): WeekPage | undefined {
  return snapshot.week.pages.find((page) => page.id === snapshot.selectedPageId)
}

type CopyOutcome =
  | { kind: "copied" }
  | { kind: "rejected"; reason: string }
  | { kind: "aborted" }

async function copyPageImage(
  operation: ExportOperation,
  page: WeekPage
): Promise<CopyOutcome> {
  const result = await exportPage(
    operation.snapshot.monday,
    operation.snapshot.week,
    page,
    {
      adapter: browserCaptureAdapter,
      metricInput: operation.snapshot.metricInput,
      signal: operation.controller.signal,
    }
  )
  if (result.kind === "blocked") {
    return { kind: "rejected", reason: formatExportIssues(result.issues) }
  }
  if (result.kind === "failed") {
    return {
      kind: "rejected",
      reason: errorMessage(result.cause, "Failed to copy image to clipboard"),
    }
  }
  // 截圖完成後操作仍可能已被中止；中止後不得寫入剪貼簿。
  if (operation.controller.signal.aborted) {
    return { kind: "aborted" }
  }
  return writeToClipboard(result.blob)
}

async function writeToClipboard(blob: Blob): Promise<CopyOutcome> {
  try {
    await copyImageToClipboard(blob, navigator.clipboard)
    return { kind: "copied" }
  } catch (cause: unknown) {
    return {
      kind: "rejected",
      reason: `Clipboard write failed: ${errorMessage(cause, "Clipboard write rejected")}`,
    }
  }
}
