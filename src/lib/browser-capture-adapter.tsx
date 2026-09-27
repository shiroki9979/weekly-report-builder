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

const OFFSCREEN_LEFT_PX = -10000

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

async function waitForSlideSettled(host: HTMLElement): Promise<void> {
  const status = () =>
    host.querySelector("[data-status]")?.getAttribute("data-status")
  const startTime = Date.now()

  while (status() === "loading") {
    if (Date.now() - startTime > 3000) {
      throw new Error("Timed out waiting for HTML slide to load")
    }
    // React 需有機會提交 HTML 非同步載入後的狀態，截圖才不會包含載入佔位內容。
    await new Promise((resolve) => setTimeout(resolve, 16))
  }
}

export const browserCaptureAdapter: CaptureAdapter = {
  async prepare(week, page) {
    const host = document.createElement("div")
    host.setAttribute("aria-hidden", "true")
    host.style.cssText = `pointer-events:none;position:fixed;opacity:0;left:${OFFSCREEN_LEFT_PX}px;top:0;width:${CAPTURE_STAGE_WIDTH}px`
    document.body.append(host)
    let root: Root | undefined
    const dispose = () => {
      try {
        root?.unmount()
      } finally {
        host.remove()
      }
    }

    try {
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
      await waitForSlideSettled(host)
      await waitForPaint()

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
