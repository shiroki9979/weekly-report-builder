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
import { abortError } from "./export-errors"
import { HTML_LOAD_TIMEOUT_MS, PAINT_SETTLE_TIMEOUT_MS } from "./capture-limits"
import type { CaptureAdapter, HtmlLoadFailure } from "./export-page-gate"
import { isHtmlWeekPage } from "./week-document"

const OFFSCREEN_LEFT_PX = -10000
const HTML_STATUS_POLL_MS = 16

export function assertCaptureHostAvailable(): void {
  if (!document.body) throw new Error("Capture host unavailable")
}

function waitForPaint(signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(abortError())

  return new Promise((resolve, reject) => {
    let frame: number | undefined
    let settled = false
    const finish = (aborted = false) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (frame !== undefined) cancelAnimationFrame(frame)
      signal?.removeEventListener("abort", onAbort)
      if (aborted) reject(abortError())
      else resolve()
    }
    const onAbort = () => finish(true)
    // 背景分頁可能永遠不派送 rAF；到期後仍可用已提交的 DOM 執行截圖。
    const timeout = setTimeout(finish, PAINT_SETTLE_TIMEOUT_MS)
    signal?.addEventListener("abort", onAbort, { once: true })
    frame = requestAnimationFrame(() => {
      if (!settled) frame = requestAnimationFrame(() => finish())
    })
  })
}

async function waitForSlideSettled(
  host: HTMLElement,
  signal?: AbortSignal
): Promise<{ kind: "ready" } | HtmlLoadFailure> {
  const slide = () => host.querySelector("[data-status]")
  const startTime = Date.now()

  while (slide()?.getAttribute("data-status") === "loading") {
    if (signal?.aborted) throw abortError()
    if (Date.now() - startTime >= HTML_LOAD_TIMEOUT_MS) {
      return {
        kind: "html-load-failed",
        message: `HTML load timed out after ${HTML_LOAD_TIMEOUT_MS} ms`,
      }
    }
    // React 需有機會提交 HTML 非同步載入後的狀態，截圖才不會包含載入佔位內容。
    await new Promise((resolve) => setTimeout(resolve, HTML_STATUS_POLL_MS))
  }

  if (signal?.aborted) throw abortError()
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
    if (signal?.aborted) throw abortError()
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
      if (signal?.aborted) throw abortError()
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
      await waitForPaint(signal)
      if (signal?.aborted) throw abortError()

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
