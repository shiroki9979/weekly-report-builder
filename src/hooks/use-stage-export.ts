import {
  useCallback,
  useRef,
  useState,
  type RefObject,
} from "react"
import { flushSync } from "react-dom"

import { copyImageToClipboard } from "@/lib/clipboard-image"
import { downloadBlob } from "@/lib/download-blob"
import { captureStageToPng } from "@/lib/stage-capture"
import type { WeekDocument, WeekPage } from "@/lib/week-document"
import { exportVisiblePages } from "@/lib/week-export"

type UseStageExportOptions = {
  monday: string
  week: WeekDocument | null
  previewStageRef: RefObject<HTMLElement | null>
  captureHostRef: RefObject<HTMLElement | null>
}

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

export function useStageExport({
  monday,
  week,
  previewStageRef,
  captureHostRef,
}: UseStageExportOptions) {
  const [capturePage, setCapturePage] = useState<WeekPage | null>(null)
  const [exporting, setExporting] = useState(false)
  const [copying, setCopying] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [clipboardError, setClipboardError] = useState<string | null>(null)
  const exportingRef = useRef(false)

  const renderPageForCapture = useCallback(
    async (page: WeekPage) => {
      flushSync(() => setCapturePage(page))
      await waitForPaint()

      const stageRoot = captureHostRef.current?.querySelector(".stage-root")
      if (!(stageRoot instanceof HTMLElement)) {
        throw new Error("Capture stage not ready")
      }

      return stageRoot
    },
    [captureHostRef]
  )

  const downloadVisiblePages = useCallback(async () => {
    if (!week || exportingRef.current) {
      return
    }

    exportingRef.current = true
    setExporting(true)
    setExportError(null)

    try {
      await exportVisiblePages(monday, week, {
        renderPage: renderPageForCapture,
        capture: captureStageToPng,
        download: downloadBlob,
      })
    } catch (cause: unknown) {
      const message =
        cause instanceof Error ? cause.message : "Failed to export PNG files"
      setExportError(message)
    } finally {
      flushSync(() => setCapturePage(null))
      setExporting(false)
      exportingRef.current = false
    }
  }, [monday, renderPageForCapture, week])

  const copyCurrentPage = useCallback(async () => {
    if (!week) {
      return
    }

    setCopying(true)
    setClipboardError(null)

    try {
      const stageRoot = previewStageRef.current
      if (!(stageRoot instanceof HTMLElement)) {
        throw new Error("Preview stage not ready")
      }

      const blob = await captureStageToPng(stageRoot)
      await copyImageToClipboard(blob, navigator.clipboard)
    } catch (cause: unknown) {
      const message =
        cause instanceof Error ? cause.message : "Failed to copy image to clipboard"
      setClipboardError(message)
    } finally {
      setCopying(false)
    }
  }, [previewStageRef, week])

  return {
    capturePage,
    exporting,
    copying,
    exportError,
    clipboardError,
    downloadVisiblePages,
    copyCurrentPage,
  }
}
