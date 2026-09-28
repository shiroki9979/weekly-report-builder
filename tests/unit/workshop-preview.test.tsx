import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { WorkshopPreview } from "@/components/workshop/workshop-preview"
import { measureStageOverflow } from "@/lib/overflow-measurement"
import type { WeekDocument } from "@/lib/week-document"
import { completePage } from "./export-fixtures"

vi.mock("@/lib/overflow-measurement", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/overflow-measurement")>()),
  measureStageOverflow: vi.fn(),
}))

const week: WeekDocument = {
  start: "2026-08-24",
  end: "2026-08-28",
  pages: [completePage],
}

function renderPreview() {
  render(
    <WorkshopPreview
      week={week}
      selectedPageIndex={0}
      onSelectPage={() => {}}
      loadStatus={{ kind: "ready" }}
      operationSnapshot={() => null}
    />
  )
}

describe("WorkshopPreview measurement notice", () => {
  beforeEach(() => {
    vi.mocked(measureStageOverflow).mockReset()
    // jsdom 沒有 ResizeObserver；可調整面板只需要它存在，不依賴回呼
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
    Object.defineProperty(Element.prototype, "getAnimations", {
      configurable: true,
      writable: true,
      value: () => [],
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("explains a preview overflow without blocking export", async () => {
    vi.mocked(measureStageOverflow).mockResolvedValue({
      status: "overflow",
      axes: ["vertical"],
    })

    renderPreview()

    expect(
      await screen.findByText(
        "Preview overflow (vertical) — export still uses the 1280 × 720 capture stage"
      )
    ).toBeInTheDocument()
  })

  it("reports a failed preview measurement instead of treating it as a fit", async () => {
    vi.mocked(measureStageOverflow).mockResolvedValue({
      status: "measurement-failed",
      message: "Timed out waiting for capture measurement to settle",
    })

    renderPreview()

    expect(
      await screen.findByText(
        "Preview measurement failed: Timed out waiting for capture measurement to settle — export measures the 1280 × 720 capture stage again"
      )
    ).toBeInTheDocument()
  })

  it("reports a rejected preview measurement", async () => {
    vi.mocked(measureStageOverflow).mockRejectedValue(
      new Error("Layout unavailable")
    )

    renderPreview()

    expect(
      await screen.findByText(
        "Preview measurement failed: Layout unavailable — export measures the 1280 × 720 capture stage again"
      )
    ).toBeInTheDocument()
  })
})
