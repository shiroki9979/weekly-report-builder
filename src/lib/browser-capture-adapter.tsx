import { flushSync } from "react-dom"
import { createRoot, type Root } from "react-dom/client"

import { StageFrame } from "@/components/stage/stage-frame"
import { StageSlide } from "@/components/stage/stage-slide"
import {
  measureStageOverflow,
  CAPTURE_STAGE_WIDTH,
  STAGE_CAPTURE_ROOT_ATTR,
} from "./overflow-measurement"
import { createStagePageContext } from "./stage-page-context"
import { captureStageToPng } from "./stage-capture"
import type { CaptureAdapter } from "./export-page-gate"
import { isHtmlWeekPage } from "./week-document"

const OFFSCREEN_LEFT_PX = -10000

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

async function waitForSlideSettled(
  host: HTMLElement,
  signal?: AbortSignal
): Promise<{ kind: "ready" } | { kind: "html-load-failed"; message: string }> {
  const slide = () => host.querySelector("[data-status]")
  const startTime = Date.now()

  while (slide()?.getAttribute("data-status") === "loading") {
    if (signal?.aborted)
      throw new DOMException("Export was aborted", "AbortError")
    if (Date.now() - startTime >= 3000) {
      return {
        kind: "html-load-failed",
        message: "HTML load timed out after 3000 ms",
      }
    }
    // React 需有機會提交 HTML 非同步載入後的狀態，截圖才不會包含載入佔位內容。
    await new Promise((resolve) => setTimeout(resolve, 16))
  }

  if (signal?.aborted)
    throw new DOMException("Export was aborted", "AbortError")
  const element = slide()
  if (!element) throw new Error("HTML slide status not found")
  if (element.getAttribute("data-status") === "error") {
    return {
      kind: "html-load-failed",
      message: element.textContent?.trim() || "HTML load failed",
    }
  }
  return { kind: "ready" }
}

export const browserCaptureAdapter: CaptureAdapter = {
  async prepare(week, page, signal) {
    if (signal?.aborted)
      throw new DOMException("Export was aborted", "AbortError")
    const host = document.createElement("div")
    host.setAttribute("aria-hidden", "true")
    host.style.cssText = `pointer-events:none;position:fixed;opacity:0;left:${OFFSCREEN_LEFT_PX}px;top:0;width:${CAPTURE_STAGE_WIDTH}px`
    document.body.append(host)
    let root: Root | undefined
    let disposed = false
    const dispose = () => {
      if (disposed) return
      disposed = true
      signal?.removeEventListener("abort", dispose)
      try {
        root?.unmount()
      } finally {
        host.remove()
      }
    }
    signal?.addEventListener("abort", dispose, { once: true })

    try {
      if (signal?.aborted)
        throw new DOMException("Export was aborted", "AbortError")
      const mountedRoot = createRoot(host)
      root = mountedRoot
      flushSync(() => {
        mountedRoot.render(
          <StageFrame>
            <StageSlide
              page={page}
              context={createStagePageContext(week, page.id)}
              isCapture
            />
          </StageFrame>
        )
      })
      if (isHtmlWeekPage(page)) {
        const load = await waitForSlideSettled(host, signal)
        if (load.kind === "html-load-failed") {
          dispose()
          return load
        }
      }
      await waitForPaint()
      if (signal?.aborted)
        throw new DOMException("Export was aborted", "AbortError")

      const stageRoot = host.querySelector(`[${STAGE_CAPTURE_ROOT_ATTR}]`)
      if (!(stageRoot instanceof HTMLElement)) {
        throw new Error("Capture stage not ready")
      }

      return {
        measure: () => measureStageOverflow(stageRoot),
        capture: () => captureStageToPng(stageRoot),
        dispose,
      }
    } catch (cause: unknown) {
      dispose()
      throw cause
    }
  },
}
