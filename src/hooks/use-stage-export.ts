import {
  useCallback,
  useRef,
  useState,
  type RefObject,
} from "react"
import { flushSync } from "react-dom"

import { copyImageToClipboard } from "@/lib/clipboard-image"
import { downloadBlob } from "@/lib/download-blob"
import { preloadHtmlFragment } from "@/lib/html-page"
import { captureStageToPng } from "@/lib/stage-capture"
import type { WeekDocument, WeekPage } from "@/lib/week-document"
import { exportVisiblePages } from "@/lib/week-export"

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
      for (const page of week.pages) {
        if (page.layout === "html" && !page.hidden) {
          try {
            await preloadHtmlFragment(monday, page.htmlFile)
          } catch {
            // Let renderPageForCapture show the stage-warning
          }
        }
      }

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

  const copyCurrentPage = useCallback(
    async (pageToCopy?: WeekPage | null) => {
      if (!week) {
        return
      }

      const targetPage = pageToCopy ?? selectedPage

      setCopying(true)
      setClipboardError(null)

      try {
        let stageRoot: HTMLElement

        if (targetPage) {
          if (targetPage.layout === "html") {
            try {
              await preloadHtmlFragment(monday, targetPage.htmlFile)
            } catch {
              // Let renderPageForCapture show the stage-warning
            }
          }
          stageRoot = await renderPageForCapture(targetPage)
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
        if (targetPage) {
          flushSync(() => setCapturePage(null))
        }
        setCopying(false)
      }
    },
    [monday, previewStageRef, renderPageForCapture, selectedPage, week]
  )

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
