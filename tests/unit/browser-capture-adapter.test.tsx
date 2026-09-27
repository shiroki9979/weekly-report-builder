import { afterEach, describe, expect, it, vi } from "vitest"

import { browserCaptureAdapter } from "@/lib/browser-capture-adapter"
import type { WeekDocument } from "@/lib/week-document"

const page = {
  id: "p01",
  layout: "two-column" as const,
  title: "Overview",
  items: [
    { heading: "One", body: "First" },
    { heading: "Two", body: "Second" },
    { heading: "Three", body: "Third" },
  ],
  panel: {
    kind: "chart" as const,
    title: "Commits",
    categories: ["24"],
    series: [{ name: "Platform", values: [1] }],
  },
}
const week: WeekDocument = {
  start: "2026-08-24",
  end: "2026-08-28",
  pages: [page],
}

describe("browserCaptureAdapter", () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("finishes preparation when background throttling suppresses animation frames", async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 1)
    )
    vi.stubGlobal("cancelAnimationFrame", vi.fn())
    try {
      const preparation = browserCaptureAdapter.prepare(week, page)
      await vi.advanceTimersByTimeAsync(1000)
      const session = await preparation
      expect("capture" in session).toBe(true)
      if ("capture" in session) session.dispose()
      expect(
        document.querySelector("[aria-hidden='true'] .stage-root")
      ).toBeNull()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("aborts a paint wait and removes the temporary host", async () => {
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 1)
    )
    vi.stubGlobal("cancelAnimationFrame", vi.fn())
    try {
      const controller = new AbortController()
      const preparation = browserCaptureAdapter.prepare(
        week,
        page,
        controller.signal
      )
      controller.abort()
      await expect(preparation).rejects.toMatchObject({ name: "AbortError" })
      expect(
        document.querySelector("[aria-hidden='true'] .stage-root")
      ).toBeNull()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
