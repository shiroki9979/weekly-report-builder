import { useCallback, useEffect, useRef, useState } from "react"

import { browserCaptureAdapter } from "@/lib/browser-capture-adapter"
import { copyImageToClipboard } from "@/lib/clipboard-image"
import { downloadBlob } from "@/lib/download-blob"
import { exportPage } from "@/lib/export-page-gate"
import { formatExportIssues } from "@/lib/export-readiness"
import type { MetricDraftBuffer } from "@/lib/metric-draft-buffer"
import type { WeekDocument, WeekPage } from "@/lib/week-document"
import {
  exportVisiblePages,
  formatSkippedExportWarning,
} from "@/lib/week-export"

type UseStageExportOptions = {
  monday: string
  week: WeekDocument | null
  selectedPage?: WeekPage | null
  metricBuffer?: MetricDraftBuffer
}

type ExportCommandResult =
  | { kind: "completed" }
  | { kind: "busy" }
  | { kind: "unavailable" }
  | { kind: "disposed" }

type OperationSnapshot = {
  monday: string
  week: WeekDocument
  selectedPage: WeekPage | null
  metricBuffer: MetricDraftBuffer
  controller: AbortController
}

export function useStageExport({
  monday,
  week,
  selectedPage,
  metricBuffer = {},
}: UseStageExportOptions) {
  const [exporting, setExporting] = useState(false)
  const [copying, setCopying] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportWarning, setExportWarning] = useState<string | null>(null)
  const [clipboardError, setClipboardError] = useState<string | null>(null)
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

  const start = useCallback((): OperationSnapshot | ExportCommandResult => {
    if (disposedRef.current) {
      return { kind: "disposed" }
    }
    if (activeRef.current) {
      return { kind: "busy" }
    }
    if (!week) {
      return { kind: "unavailable" }
    }

    // 編輯器可能直接修改巢狀頁面或草稿；操作必須保留接受當下的完整資料。
    const snapshotWeek = structuredClone(week)
    const operation: OperationSnapshot = {
      monday,
      week: snapshotWeek,
      selectedPage: selectedPage
        ? (snapshotWeek.pages.find((page) => page.id === selectedPage.id) ??
          structuredClone(selectedPage))
        : null,
      metricBuffer: structuredClone(metricBuffer),
      controller: new AbortController(),
    }
    activeRef.current = operation
    return operation
  }, [metricBuffer, monday, selectedPage, week])

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
      const operation = start()
      if (!("controller" in operation)) {
        return operation
      }

      setExporting(true)
      setExportError(null)
      setExportWarning(null)

      try {
        const skipped = await exportVisiblePages(
          operation.monday,
          operation.week,
          {
            adapter: browserCaptureAdapter,
            download: downloadBlob,
            metricBuffer: operation.metricBuffer,
            signal: operation.controller.signal,
          }
        )
        if (!isActive(operation)) {
          return { kind: "disposed" }
        }
        const warning = formatSkippedExportWarning(skipped)
        setExportWarning(
          warning ? `Export for ${operation.monday}: ${warning}` : null
        )
      } catch (cause: unknown) {
        if (!isActive(operation)) {
          return { kind: "disposed" }
        }
        const message =
          cause instanceof Error ? cause.message : "Failed to export PNG files"
        setExportError(`Export for ${operation.monday}: ${message}`)
      } finally {
        finish(operation)
      }
      return { kind: "completed" }
    }, [finish, isActive, start])

  const copyCurrentPage =
    useCallback(async (): Promise<ExportCommandResult> => {
      if (!selectedPage && !activeRef.current) {
        return { kind: "unavailable" }
      }
      const operation = start()
      if (!("controller" in operation)) {
        return operation
      }
      const page = operation.selectedPage
      if (!page) {
        finish(operation)
        return { kind: "unavailable" }
      }

      setCopying(true)
      setClipboardError(null)

      try {
        const result = await exportPage(
          operation.week,
          page,
          browserCaptureAdapter,
          operation.metricBuffer,
          operation.controller.signal
        )
        if (!isActive(operation)) {
          return { kind: "disposed" }
        }
        if (result.kind === "blocked") {
          setClipboardError(
            `Copy ${page.id} from ${operation.monday}: ${formatExportIssues(result.issues)}`
          )
          return { kind: "completed" }
        }
        if (result.kind === "failed") {
          throw result.cause
        }
        await copyImageToClipboard(result.blob, navigator.clipboard)
        if (!isActive(operation)) {
          return { kind: "disposed" }
        }
      } catch (cause: unknown) {
        if (!isActive(operation)) {
          return { kind: "disposed" }
        }
        const message =
          cause instanceof Error
            ? cause.message
            : "Failed to copy image to clipboard"
        setClipboardError(
          `Copy ${page.id} from ${operation.monday}: ${message}`
        )
      } finally {
        finish(operation)
      }
      return { kind: "completed" }
    }, [finish, isActive, selectedPage, start])

  return {
    exporting,
    copying,
    exportError,
    exportWarning,
    clipboardError,
    downloadVisiblePages,
    copyCurrentPage,
  }
}
