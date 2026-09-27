import { useCallback, useEffect, useRef, useState } from "react"

import {
  assertCaptureHostAvailable,
  browserCaptureAdapter,
} from "@/lib/browser-capture-adapter"
import { copyImageToClipboard } from "@/lib/clipboard-image"
import { downloadBlob } from "@/lib/download-blob"
import { errorMessage } from "@/lib/export-errors"
import { exportPage } from "@/lib/export-page-gate"
import { formatExportIssues } from "@/lib/export-readiness"
import { summarizeExportResult, type ExportResult } from "@/lib/export-result"
import type { MetricInputMap } from "@/lib/metric-input"
import type { WeekDocument, WeekPage } from "@/lib/week-document"
import { exportVisiblePages } from "@/lib/week-export"

type UseStageExportOptions = {
  monday: string
  week: WeekDocument | null
  selectedPage?: WeekPage | null
  metricBuffer?: MetricInputMap
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
  metricBuffer: MetricInputMap
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

  const start = useCallback(():
    { kind: "started"; operation: OperationSnapshot } | ExportCommandResult => {
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
    setLastResult(null)
    return { kind: "started", operation }
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
      const started = start()
      if (started.kind !== "started") {
        return started
      }
      const { operation } = started

      setExporting(true)

      try {
        const result = await exportVisiblePages(
          operation.monday,
          operation.week,
          {
            adapter: browserCaptureAdapter,
            download: downloadBlob,
            metricBuffer: operation.metricBuffer,
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
      if (!selectedPage && !activeRef.current) {
        return { kind: "unavailable" }
      }
      const started = start()
      if (started.kind !== "started") {
        return started
      }
      const { operation } = started
      const page = operation.selectedPage
      if (!page) {
        finish(operation)
        return { kind: "unavailable" }
      }

      setCopying(true)

      try {
        const result = await exportPage(operation.week, page, {
          adapter: browserCaptureAdapter,
          metricBuffer: operation.metricBuffer,
          signal: operation.controller.signal,
        })
        if (!isActive(operation)) {
          return { kind: "disposed" }
        }
        if (result.kind === "blocked") {
          setLastResult({
            kind: "copy",
            monday: operation.monday,
            pageId: page.id,
            error: formatExportIssues(result.issues),
          })
          return { kind: "completed" }
        }
        if (result.kind === "failed") {
          throw result.cause
        }
        try {
          await copyImageToClipboard(result.blob, navigator.clipboard)
        } catch (cause: unknown) {
          throw new Error(
            `Clipboard write failed: ${errorMessage(cause, "Clipboard write rejected")}`,
            { cause }
          )
        }
        if (!isActive(operation)) {
          return { kind: "disposed" }
        }
        setLastResult({
          kind: "copy",
          monday: operation.monday,
          pageId: page.id,
          error: null,
        })
      } catch (cause: unknown) {
        if (!isActive(operation)) {
          return { kind: "disposed" }
        }
        setLastResult({
          kind: "copy",
          monday: operation.monday,
          pageId: page.id,
          error: errorMessage(cause, "Failed to copy image to clipboard"),
        })
      } finally {
        finish(operation)
      }
      return { kind: "completed" }
    }, [finish, isActive, selectedPage, start])

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
