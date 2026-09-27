import { act, render } from "@testing-library/react"
import { useEffect } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useStageExport } from "@/hooks/use-stage-export"
import { downloadBlob } from "@/lib/download-blob"
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
  const exportState = useStageExport({
    monday: week.start,
    week,
    selectedPage: week.pages[0],
    metricBuffer,
  })

  useEffect(() => {
    if (exportRef) {
      exportRef.current = exportState
    }
  })

  return null
}

describe("useStageExport", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.mocked(stageCapture.captureStageToPng).mockResolvedValue(
      new Blob(["test-png"], { type: "image/png" })
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("skips a 404 HTML Page, then captures the next page without a warning PNG", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "<h1>Ready</h1>",
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
        {
          id: "p04",
          layout: "html",
          title: "Ready Slide",
          htmlFile: "ready.html",
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

    expect(stageCapture.captureStageToPng).toHaveBeenCalledOnce()
    expect(capturedHtml).toContain("Ready")
    expect(capturedHtml).not.toContain("stage-warning")
    expect(capturedHtml).not.toContain("stage-placeholder")
    expect(capturedHtml).not.toContain("Loading HTML slide")
    expect(exportRef.current?.exportResult).toContain(
      "p03: Failed to load HTML file: missing.html (status 404)"
    )
    expect(downloadBlob).toHaveBeenCalledOnce()
    expect(
      document.querySelector("[aria-hidden='true'] .stage-root")
    ).toBeNull()
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
    expect(
      document.querySelector("[aria-hidden='true'] .stage-root")
    ).toBeNull()
  })

  it.each([
    ["invalid reference", "../bad.html", "Invalid HTML file: ../bad.html"],
    ["network error", "offline.html", "Network unavailable"],
  ])("blocks Copy for an %s", async (_scenario, htmlFile, reason) => {
    if (htmlFile === "offline.html") {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error(reason))
    }
    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [{ id: "p03", layout: "html", title: "Broken", htmlFile }],
    }
    const exportRef: { current: ReturnType<typeof useStageExport> | null } = {
      current: null,
    }
    render(<ExportTestComponent week={week} exportRef={exportRef} />)

    await act(async () => {
      await exportRef.current?.copyCurrentPage()
    })

    expect(exportRef.current?.exportResult).toBe(
      `Copy p03 from 2026-08-24: ${reason}`
    )
    expect(stageCapture.captureStageToPng).not.toHaveBeenCalled()
    expect(downloadBlob).not.toHaveBeenCalled()
  })

  it("skips a slide that never finishes loading", async () => {
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
    expect(exportRef.current?.resultIsError).toBe(false)
    expect(exportRef.current?.exportResult).toContain(
      "Skipped pages: p03: HTML load timed out after 3000 ms"
    )
    expect(
      document.querySelector("[aria-hidden='true'] .stage-root")
    ).toBeNull()
  })

  it("uses and disposes an owned canonical capture root after capture fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => "<p>Ready</p>",
    } as Response)
    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          id: "p03",
          layout: "html",
          title: "Invalid",
          htmlFile: "ready.html",
        },
      ],
    }
    vi.mocked(stageCapture.captureStageToPng).mockImplementation(
      async (element) => {
        expect(element.hasAttribute("data-stage-capture-root")).toBe(true)
        expect(element.closest("[aria-hidden='true']")).not.toBeNull()
        throw new Error("Screenshot failed")
      }
    )
    const exportRef: { current: ReturnType<typeof useStageExport> | null } = {
      current: null,
    }
    render(<ExportTestComponent week={week} exportRef={exportRef} />)

    await act(async () => {
      await exportRef.current?.copyCurrentPage()
    })

    expect(exportRef.current?.exportResult).toBe(
      "Copy p03 from 2026-08-24: Screenshot failed"
    )
    expect(
      document.querySelector("[aria-hidden='true'] .stage-root")
    ).toBeNull()
  })

  it("reports a missing canonical root and removes the temporary host", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => "<p>Ready</p>",
    } as Response)
    const originalQuerySelector = HTMLElement.prototype.querySelector
    vi.spyOn(HTMLElement.prototype, "querySelector").mockImplementation(
      function (this: HTMLElement, selector: string) {
        return selector === "[data-stage-capture-root]"
          ? null
          : originalQuerySelector.call(this, selector)
      }
    )
    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          id: "p03",
          layout: "html",
          title: "Invalid",
          htmlFile: "ready.html",
        },
      ],
    }
    const exportRef: { current: ReturnType<typeof useStageExport> | null } = {
      current: null,
    }
    render(<ExportTestComponent week={week} exportRef={exportRef} />)

    await act(async () => {
      await exportRef.current?.copyCurrentPage()
    })

    expect(exportRef.current?.exportResult).toBe(
      "Copy p03 from 2026-08-24: Capture stage not ready"
    )
    expect(stageCapture.captureStageToPng).not.toHaveBeenCalled()
    expect(
      document.querySelector("[aria-hidden='true'] .stage-root")
    ).toBeNull()
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

    expect(exportRef.current?.exportResult).toBe(
      "Export for 2026-08-24: Downloads triggered: 0; Skipped: 1; Failed: 0; Not attempted: 0. Skipped pages: p04: This layout cannot be exported"
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
    expect(exportRef.current?.exportResult).toMatch(/title/i)
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
    expect(exportRef.current?.exportResult).toBe(
      "Copy p01 from 2026-08-24: metrics[0].baselineValue: Metric value must be a finite non-negative number"
    )
  })
})
