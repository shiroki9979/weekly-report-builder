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
import { exportVisiblePages, listSkippedPages } from "@/lib/week-export"

type UseStageExportOptions = {
  monday: string
  week: WeekDocument | null
  selectedPage?: WeekPage | null
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

async function waitForSlideSettled(host: HTMLElement): Promise<void> {
  const getStatus = () => {
    const slide = host.querySelector("[data-status]")
    if (!slide) {
      // 非 HTML 頁面或無非同步狀態元件，視為就緒
      return "ready"
    }
    return slide.getAttribute("data-status")
  }

  const maxWaitMs = 3000
  const startTime = Date.now()

  while (getStatus() === "loading") {
    if (Date.now() - startTime > maxWaitMs) {
      throw new Error("Timed out waiting for HTML slide to load")
    }
    // 釋放執行緒讓 React 調度器能沖刷非同步 fetch 後的 state 更新，並相容真實瀏覽器與測試環境
    await new Promise((resolve) => setTimeout(resolve, 16))
  }
}

export function useStageExport({
  monday,
  week,
  selectedPage,
  previewStageRef,
  captureHostRef,
}: UseStageExportOptions) {
  const [capturePage, setCapturePage] = useState<WeekPage | null>(null)
  const [exporting, setExporting] = useState(false)
  const [copying, setCopying] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportWarning, setExportWarning] = useState<string | null>(null)
  const [clipboardError, setClipboardError] = useState<string | null>(null)
  const exportingRef = useRef(false)

  const renderPageForCapture = useCallback(
    async (page: WeekPage) => {
      flushSync(() => setCapturePage(page))

      const host = captureHostRef.current
      if (!host) {
        throw new Error("Capture stage not ready")
      }

      // 等候非同步載入的 HTML 片段結算至 ready 或 error 狀態，避免截圖拍到載入中的佔位元件
      await waitForSlideSettled(host)
      await waitForPaint()

      const stageRoot = host.querySelector(".stage-root")
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
    const skippedPageIds = listSkippedPages(week).map((page) => page.id)
    setExportWarning(
      skippedPageIds.length > 0
        ? `Skipped unsupported layouts: ${skippedPageIds.join(", ")}`
        : null
    )

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
      let stageRoot: HTMLElement

      if (selectedPage) {
        stageRoot = await renderPageForCapture(selectedPage)
      } else {
        const previewRoot = previewStageRef.current
        if (!(previewRoot instanceof HTMLElement)) {
          throw new Error("Preview stage not ready")
        }
        stageRoot = previewRoot
      }

      const blob = await captureStageToPng(stageRoot)
      await copyImageToClipboard(blob, navigator.clipboard)
    } catch (cause: unknown) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Failed to copy image to clipboard"
      setClipboardError(message)
    } finally {
      if (selectedPage) {
        flushSync(() => setCapturePage(null))
      }
      setCopying(false)
    }
  }, [previewStageRef, renderPageForCapture, selectedPage, week])

  return {
    capturePage,
    exporting,
    copying,
    exportError,
    exportWarning,
    clipboardError,
    downloadVisiblePages,
    copyCurrentPage,
  }
}
