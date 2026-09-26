import { act, render } from "@testing-library/react"
import { useEffect, useRef } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { StageCaptureHost } from "@/components/workshop/export-controls"
import { useStageExport } from "@/hooks/use-stage-export"
import type { MetricDraftBuffer } from "@/lib/metric-draft-buffer"
import * as stageCapture from "@/lib/stage-capture"
import { createBlankTwoColumnPage } from "@/lib/page-lifecycle"
import type { EvidenceDecisionPage, WeekDocument } from "@/lib/week-document"

vi.mock("@/lib/stage-capture", () => ({
  captureStageToPng: vi.fn(
    async () => new Blob(["test-png"], { type: "image/png" })
  ),
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
  metricBuffer,
}: {
  week: WeekDocument
  exportRef?: {
    current: ReturnType<typeof useStageExport> | null
  }
  metricBuffer?: MetricDraftBuffer
}) {
  const previewStageRef = useRef<HTMLDivElement>(null)
  const captureHostRef = useRef<HTMLDivElement>(null)

  const exportState = useStageExport({
    monday: week.start,
    week,
    selectedPage: week.pages[0],
    captureHostRef,
    metricBuffer,
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
        week={week}
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

    render(<ExportTestComponent week={week} exportRef={exportRef} />)

    await act(async () => {
      await exportRef.current?.downloadVisiblePages()
    })

    // 截圖應包含 stage-warning 錯誤訊息，而非載入中的 stage-placeholder
    expect(capturedHtml).toContain("stage-warning")
    expect(capturedHtml).toContain(
      "Failed to load HTML file: missing.html (status 404)"
    )
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

    render(<ExportTestComponent week={week} exportRef={exportRef} />)

    await act(async () => {
      await exportRef.current?.copyCurrentPage()
    })

    expect(capturedHtml).toContain("Rendered Content")
    expect(capturedHtml).not.toContain("stage-placeholder")
    expect(capturedHtml).not.toContain("Loading HTML slide")
  })

  it("reports an error instead of capturing a slide that never finishes loading", async () => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise<Response>(() => undefined)
    )

    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          id: "p03",
          layout: "html",
          title: "Slow Slide",
          htmlFile: "slow.html",
        },
      ],
    }

    const exportRef: { current: ReturnType<typeof useStageExport> | null } = {
      current: null,
    }
    render(<ExportTestComponent week={week} exportRef={exportRef} />)

    let downloadPromise: Promise<void> | undefined
    act(() => {
      downloadPromise = exportRef.current?.downloadVisiblePages()
    })

    await act(async () => {
      await vi.runAllTimersAsync()
      await downloadPromise
    })

    expect(stageCapture.captureStageToPng).not.toHaveBeenCalled()
    expect(exportRef.current?.exportError).toBe(
      "Timed out waiting for HTML slide to load"
    )
  })

  it("warns when batch export skips unsupported layouts", async () => {
    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          id: "p04",
          layout: "future-layout",
          title: "Future Slide",
        },
      ],
    }
    const exportRef: { current: ReturnType<typeof useStageExport> | null } = {
      current: null,
    }
    render(<ExportTestComponent week={week} exportRef={exportRef} />)

    await act(async () => {
      await exportRef.current?.downloadVisiblePages()
    })

    expect(exportRef.current?.exportWarning).toBe(
      "Skipped pages: p04: unsupported"
    )
  })

  it("blocks copy of a draft two-column page without capturing", async () => {
    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [createBlankTwoColumnPage("p01", "table")],
    }
    const exportRef: { current: ReturnType<typeof useStageExport> | null } = {
      current: null,
    }
    render(<ExportTestComponent week={week} exportRef={exportRef} />)

    await act(async () => {
      await exportRef.current?.copyCurrentPage()
    })

    expect(stageCapture.captureStageToPng).not.toHaveBeenCalled()
    expect(exportRef.current?.clipboardError).toMatch(/title/i)
  })

  it("blocks copy of a complete evidence-decision page with an invalid metric draft", async () => {
    const page: EvidenceDecisionPage = {
      id: "p01",
      layout: "evidence-decision",
      title: "Ship the candidate.",
      verdict: "Adopt the candidate.",
      metrics: [
        {
          label: "Turnaround",
          baselineValue: 9.4,
          candidateValue: 5.1,
          unit: "days",
          unitPosition: "after",
          unitSpacing: "space",
          precision: 1,
        },
      ],
      interpretations: ["The candidate finishes the same week."],
    }
    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [page],
    }
    const exportRef: { current: ReturnType<typeof useStageExport> | null } = {
      current: null,
    }
    render(
      <ExportTestComponent
        week={week}
        exportRef={exportRef}
        metricBuffer={{ p01: { "metrics[0].baselineValue": "abc" } }}
      />
    )

    await act(async () => {
      await exportRef.current?.copyCurrentPage()
    })

    expect(stageCapture.captureStageToPng).not.toHaveBeenCalled()
    expect(exportRef.current?.clipboardError).toBe(
      "metrics[0].baselineValue: Metric value must be a finite non-negative number"
    )
  })
})
