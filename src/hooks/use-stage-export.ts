import { useCallback, useRef, useState, type RefObject } from "react"
import { flushSync } from "react-dom"

import { copyImageToClipboard } from "@/lib/clipboard-image"
import { downloadBlob } from "@/lib/download-blob"
import {
  assessExportEligibility,
  formatExportIssues,
} from "@/lib/export-readiness"
import { measureStageOverflow } from "@/lib/overflow-measurement"
import { captureStageToPng } from "@/lib/stage-capture"
import {
  isHtmlWeekPage,
  type WeekDocument,
  type WeekPage,
} from "@/lib/week-document"
import {
  exportVisiblePages,
  formatSkippedExportWarning,
} from "@/lib/week-export"

type UseStageExportOptions = {
  monday: string
  week: WeekDocument | null
  selectedPage?: WeekPage | null
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

function blockedBeforeCapture(
  page: WeekPage
): ReturnType<typeof assessExportEligibility> | null {
  const assessment = assessExportEligibility(page)
  const blocked = assessment.issues.some(
    (issue) => issue.code !== "measurement-failed"
  )
  if (!assessment.eligible && blocked) {
    return assessment
  }
  return null
}

export function useStageExport({
  monday,
  week,
  selectedPage,
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
    setExportWarning(null)

    try {
      const skipped = await exportVisiblePages(monday, week, {
        renderPage: renderPageForCapture,
        capture: captureStageToPng,
        download: downloadBlob,
        measureCapture: measureStageOverflow,
      })
      setExportWarning(formatSkippedExportWarning(skipped))
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
    if (!week || !selectedPage) {
      return
    }

    setCopying(true)
    setClipboardError(null)

    try {
      const blocked = blockedBeforeCapture(selectedPage)
      if (blocked) {
        setClipboardError(formatExportIssues(blocked.issues))
        return
      }

      let stageRoot: HTMLElement

      if (isHtmlWeekPage(selectedPage)) {
        stageRoot = await renderPageForCapture(selectedPage)
      } else {
        stageRoot = await renderPageForCapture(selectedPage)
        const capture = await measureStageOverflow(stageRoot)
        const assessment = assessExportEligibility(selectedPage, capture)
        if (!assessment.eligible) {
          setClipboardError(formatExportIssues(assessment.issues))
          return
        }
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
      flushSync(() => setCapturePage(null))
      setCopying(false)
    }
  }, [renderPageForCapture, selectedPage, week])

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
