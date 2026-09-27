import { useCallback, useEffect, useRef, useState } from "react"

import {
  assertCaptureHostAvailable,
  browserCaptureAdapter,
} from "@/lib/browser-capture-adapter"
import { copyImageToClipboard } from "@/lib/clipboard-image"
import { downloadBlob } from "@/lib/download-blob"
import type { SessionOperationSnapshot } from "@/lib/editing-session"
import { errorMessage } from "@/lib/export-errors"
import { exportPage } from "@/lib/export-page-gate"
import { formatExportIssues } from "@/lib/export-readiness"
import { summarizeExportResult, type ExportResult } from "@/lib/export-result"
import type { WeekDocument, WeekPage } from "@/lib/week-document"
import { exportVisiblePages } from "@/lib/week-export"

type UseStageExportOptions = {
  operationSnapshot: () => SessionOperationSnapshot | null
}

type ExportCommandResult =
  | { kind: "completed" }
  | { kind: "busy" }
  | { kind: "unavailable" }
  | { kind: "disposed" }

type OperationSnapshot = {
  data: SessionOperationSnapshot
  controller: AbortController
}

export function useStageExport({ operationSnapshot }: UseStageExportOptions) {
  const [exporting, setExporting] = useState(false)
  const [copying, setCopying] = useState(false)
  const [lastResult, setLastResult] = useState<ExportResult | null>(null)
  const activeRef = useRef<OperationSnapshot | null>(null)
  const disposedRef = useRef(false)

  useEffect(() => {
    disposedRef.current = false
    return () => {
      disposedRef.current = true
      activeRef.current?.controller.abort()
      activeRef.current = null
    }
  }, [])

  const start = useCallback(
    (
      requireSelectedPage = false
    ):
      | { kind: "started"; operation: OperationSnapshot }
      | ExportCommandResult => {
      if (disposedRef.current) {
        return { kind: "disposed" }
      }
      if (activeRef.current) {
        return { kind: "busy" }
      }
      const data = operationSnapshot()
      if (
        !data ||
        (requireSelectedPage &&
          !data.week.pages.some((page) => page.id === data.selectedPageId))
      ) {
        return { kind: "unavailable" }
      }

      const operation: OperationSnapshot = {
        data,
        controller: new AbortController(),
      }
      activeRef.current = operation
      setLastResult(null)
      return { kind: "started", operation }
    },
    [operationSnapshot]
  )

  const isActive = useCallback(
    (operation: OperationSnapshot) =>
      activeRef.current === operation && !operation.controller.signal.aborted,
    []
  )

  const finish = useCallback((operation: OperationSnapshot) => {
    if (activeRef.current === operation) {
      activeRef.current = null
      setExporting(false)
      setCopying(false)
    }
  }, [])

  const downloadVisiblePages =
    useCallback(async (): Promise<ExportCommandResult> => {
      const started = start()
      if (started.kind !== "started") {
        return started
      }
      const { operation } = started
      const { data } = operation

      setExporting(true)

      try {
        const result = await exportVisiblePages(
          data.monday,
          data.week as WeekDocument,
          {
            adapter: browserCaptureAdapter,
            download: downloadBlob,
            metricBuffer: data.metricInput,
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
      const started = start(true)
      if (started.kind !== "started") {
        return started
      }
      const { operation } = started
      const { data } = operation
      const page = data.week.pages.find(
        (entry) => entry.id === data.selectedPageId
      )
      if (!page) {
        finish(operation)
        return { kind: "unavailable" }
      }

      setCopying(true)

      try {
        const outcome = await copyPageImage(operation, page)
        if (!isActive(operation)) {
          return { kind: "disposed" }
        }
        setLastResult({
          kind: "copy",
          monday: data.monday,
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

type CopyOutcome =
  | { kind: "copied" }
  | { kind: "rejected"; reason: string }
  | { kind: "aborted" }

async function copyPageImage(
  operation: OperationSnapshot,
  page: WeekPage
): Promise<CopyOutcome> {
  const result = await exportPage(operation.data.week as WeekDocument, page, {
    adapter: browserCaptureAdapter,
    metricBuffer: operation.data.metricInput,
    signal: operation.controller.signal,
  })
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
