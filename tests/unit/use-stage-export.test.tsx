import { act, render } from "@testing-library/react"
import { useEffect, useRef } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { StageCaptureHost } from "@/components/workshop/export-controls"
import { useStageExport } from "@/hooks/use-stage-export"
import * as stageCapture from "@/lib/stage-capture"
import type { WeekDocument } from "@/lib/week-document"

vi.mock("@/lib/stage-capture", () => ({
  captureStageToPng: vi.fn(async () => new Blob(["test-png"], { type: "image/png" })),
}))

vi.mock("@/lib/download-blob", () => ({
  downloadBlob: vi.fn(),
}))

vi.mock("@/lib/clipboard-image", () => ({
  copyImageToClipboard: vi.fn(),
}))

function ExportTestComponent({
  week,
  exportRef,
}: {
  week: WeekDocument
  exportRef?: {
    current: ReturnType<typeof useStageExport> | null
  }
}) {
  const previewStageRef = useRef<HTMLDivElement>(null)
  const captureHostRef = useRef<HTMLDivElement>(null)

  const exportState = useStageExport({
    monday: week.start,
    week,
    selectedPage: week.pages[0],
    previewStageRef,
    captureHostRef,
  })

  useEffect(() => {
    if (exportRef) {
      exportRef.current = exportState
    }
  })

  return (
    <div>
      <div ref={previewStageRef} className="stage-root">
        Preview Stage
      </div>
      <StageCaptureHost
        page={exportState.capturePage}
        monday={week.start}
        hostRef={captureHostRef}
      />
    </div>
  )
}

describe("useStageExport", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("waits for HTML slide to settle to error state and captures stage-warning instead of loading placeholder", async () => {
    // 模擬 HTML 片段檔案不存在（404），以驗證 capture host 會等待至結算為 error 警告再執行截圖
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as Response)

    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          id: "p03",
          layout: "html",
          title: "Missing Slide",
          htmlFile: "missing.html",
        },
      ],
    }

    let capturedHtml = ""
    vi.mocked(stageCapture.captureStageToPng).mockImplementation(async (el) => {
      capturedHtml = el.innerHTML
      return new Blob(["captured"], { type: "image/png" })
    })

    const exportRef: { current: ReturnType<typeof useStageExport> | null } = {
      current: null,
    }

    render(
      <ExportTestComponent
        week={week}
        exportRef={exportRef}
      />
    )

    await act(async () => {
      await exportRef.current?.downloadVisiblePages()
    })

    // 截圖應包含 stage-warning 錯誤訊息，而非載入中的 stage-placeholder
    expect(capturedHtml).toContain("stage-warning")
    expect(capturedHtml).toContain("Failed to load HTML file: missing.html")
    expect(capturedHtml).not.toContain("stage-placeholder")
    expect(capturedHtml).not.toContain("Loading HTML slide")
  })

  it("waits for HTML slide to settle to ready state and captures rendered HTML content", async () => {
    // 模擬非同步載入成功的 HTML 片段，驗證 capture host 正確擷取 Light DOM 渲染結果
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      text: async () => '<div class="banner">Rendered Content</div>',
    } as Response)

    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          id: "p03",
          layout: "html",
          title: "Custom Slide",
          htmlFile: "custom.html",
        },
      ],
    }

    let capturedHtml = ""
    vi.mocked(stageCapture.captureStageToPng).mockImplementation(async (el) => {
      capturedHtml = el.innerHTML
      return new Blob(["captured"], { type: "image/png" })
    })

    const exportRef: { current: ReturnType<typeof useStageExport> | null } = {
      current: null,
    }

    render(
      <ExportTestComponent
        week={week}
        exportRef={exportRef}
      />
    )

    await act(async () => {
      await exportRef.current?.copyCurrentPage()
    })

    expect(capturedHtml).toContain("Rendered Content")
    expect(capturedHtml).not.toContain("stage-placeholder")
    expect(capturedHtml).not.toContain("Loading HTML slide")
  })
})
