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
        const result = await exportPage(
          data.week as WeekDocument,
          page as WeekPage,
          {
            adapter: browserCaptureAdapter,
            metricBuffer: data.metricInput,
            signal: operation.controller.signal,
          }
        )
        if (!isActive(operation)) {
          return { kind: "disposed" }
        }
        if (result.kind === "blocked") {
          setLastResult({
            kind: "copy",
            monday: data.monday,
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
          monday: data.monday,
          pageId: page.id,
          error: null,
        })
      } catch (cause: unknown) {
        if (!isActive(operation)) {
          return { kind: "disposed" }
        }
        setLastResult({
          kind: "copy",
          monday: data.monday,
          pageId: page.id,
          error: errorMessage(cause, "Failed to copy image to clipboard"),
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
