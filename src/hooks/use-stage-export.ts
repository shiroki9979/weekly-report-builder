import { useCallback, useRef, useState } from "react"

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
  const exportingRef = useRef(false)

  const downloadVisiblePages = useCallback(async () => {
    if (!week || exportingRef.current) {
      return
    }

    exportingRef.current = true
    setExporting(true)
    setExportError(null)
    setExportWarning(null)

    try {
      const skipped = await exportVisiblePages(monday, week, {
        adapter: browserCaptureAdapter,
        download: downloadBlob,
        metricBuffer,
      })
      setExportWarning(formatSkippedExportWarning(skipped))
    } catch (cause: unknown) {
      setExportError(
        cause instanceof Error ? cause.message : "Failed to export PNG files"
      )
    } finally {
      setExporting(false)
      exportingRef.current = false
    }
  }, [monday, metricBuffer, week])

  const copyCurrentPage = useCallback(async () => {
    if (!week || !selectedPage) {
      return
    }

    setCopying(true)
    setClipboardError(null)

    try {
      const result = await exportPage(
        week,
        selectedPage,
        browserCaptureAdapter,
        metricBuffer
      )
      if (result.kind === "blocked") {
        setClipboardError(formatExportIssues(result.issues))
        return
      }
      if (result.kind === "failed") {
        throw result.cause
      }
      await copyImageToClipboard(result.blob, navigator.clipboard)
    } catch (cause: unknown) {
      setClipboardError(
        cause instanceof Error
          ? cause.message
          : "Failed to copy image to clipboard"
      )
    } finally {
      setCopying(false)
    }
  }, [metricBuffer, selectedPage, week])

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
