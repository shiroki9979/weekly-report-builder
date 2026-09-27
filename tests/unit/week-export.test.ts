import { describe, expect, it, vi } from "vitest"

import { exportPage, type CaptureAdapter } from "@/lib/export-page-gate"
import { createBlankTwoColumnPage } from "@/lib/page-lifecycle"
import type { WeekDocument } from "@/lib/week-document"
import {
  exportFileName,
  exportVisiblePages,
  formatSkippedExportWarning,
} from "@/lib/week-export"

const completePage = {
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
  pages: [
    completePage,
    { ...completePage, id: "p02", hidden: true },
    { ...completePage, id: "p03" },
  ],
}

function fakeAdapter(status: "fit" | "overflow" = "fit") {
  const prepare = vi.fn<
    () => Promise<Awaited<ReturnType<CaptureAdapter["prepare"]>>>
  >(async () => ({
    measure: async () =>
      status === "fit"
        ? { status: "fit" }
        : { status: "overflow", axes: ["vertical"] },
    capture: async () => new Blob(["png"], { type: "image/png" }),
    dispose: vi.fn(),
  }))
  return { prepare }
}

describe("shared page export", () => {
  it("captures a fit page and disposes its session", async () => {
    const dispose = vi.fn()
    const adapter: CaptureAdapter = {
      prepare: async () => ({
        measure: async () => ({ status: "fit" }),
        capture: async () => new Blob(["png"]),
        dispose,
      }),
    }

    const result = await exportPage(week, week.pages[0], adapter)

    expect(result.kind).toBe("captured")
    expect(dispose).toHaveBeenCalledOnce()
  })

  it("blocks unsupported, draft, and invalid metric pages before opening a session", async () => {
    const adapter = fakeAdapter()
    const unsupportedWeek: WeekDocument = {
      ...week,
      pages: [{ id: "p04", layout: "future-layout", title: "Future" }],
    }
    const draft = createBlankTwoColumnPage("p05", "table")

    expect(
      (await exportPage(unsupportedWeek, unsupportedWeek.pages[0], adapter))
        .kind
    ).toBe("blocked")
    expect((await exportPage(week, draft, adapter)).kind).toBe("blocked")
    expect(adapter.prepare).not.toHaveBeenCalled()
  })

  it("blocks overflow without capturing and disposes the session", async () => {
    const capture = vi.fn(async () => new Blob(["png"]))
    const dispose = vi.fn()
    const adapter: CaptureAdapter = {
      prepare: async () => ({
        measure: async () => ({ status: "overflow", axes: ["vertical"] }),
        capture,
        dispose,
      }),
    }

    const result = await exportPage(week, week.pages[0], adapter)

    expect(result).toMatchObject({
      kind: "blocked",
      issues: [{ code: "overflow" }],
    })
    expect(capture).not.toHaveBeenCalled()
    expect(dispose).toHaveBeenCalledOnce()
  })

  it("returns a distinct operation failure and disposes a failed capture", async () => {
    const dispose = vi.fn()
    const failure = new Error("Capture failed")
    const adapter: CaptureAdapter = {
      prepare: async () => ({
        measure: async () => ({ status: "fit" }),
        capture: async () => {
          throw failure
        },
        dispose,
      }),
    }

    expect(await exportPage(week, week.pages[0], adapter)).toEqual({
      kind: "failed",
      cause: failure,
    })
    expect(dispose).toHaveBeenCalledOnce()
  })

  it("treats an absent shared capture root as an operation failure", async () => {
    const cause = new Error("Capture stage not ready")
    const adapter: CaptureAdapter = {
      prepare: async () => {
        throw cause
      },
    }

    expect(await exportPage(week, week.pages[0], adapter)).toEqual({
      kind: "failed",
      cause,
    })
    await expect(
      exportVisiblePages(week.start, week, { adapter, download: vi.fn() })
    ).rejects.toThrow("Capture stage not ready")
  })

  it("captures a Hidden HTML Page individually without measuring it", async () => {
    const measure = vi.fn()
    const capture = vi.fn(async () => new Blob(["png"]))
    const adapter: CaptureAdapter = {
      prepare: async () => ({ measure, capture, dispose: vi.fn() }),
    }
    const htmlPage = {
      id: "p04",
      layout: "html" as const,
      title: "Hidden HTML",
      htmlFile: "p04.html",
      hidden: true,
    }
    const htmlWeek: WeekDocument = { ...week, pages: [...week.pages, htmlPage] }

    expect((await exportPage(htmlWeek, htmlPage, adapter)).kind).toBe(
      "captured"
    )
    expect(measure).not.toHaveBeenCalled()
    expect(capture).toHaveBeenCalledOnce()
  })
})

describe("batch export", () => {
  it("preserves filenames and numbering gaps while silently excluding Hidden Pages", async () => {
    const adapter = fakeAdapter()
    const download = vi.fn()

    const skipped = await exportVisiblePages("2026-08-24", week, {
      adapter,
      download,
    })

    expect(skipped).toEqual([])
    expect(adapter.prepare.mock.calls.map((call) => call[1].id)).toEqual([
      "p01",
      "p03",
    ])
    expect(download.mock.calls.map((call) => call[1])).toEqual([
      "2026-08-24-p01.png",
      "2026-08-24-p03.png",
    ])
    expect(exportFileName("2026-08-24", "p02")).toBe("2026-08-24-p02.png")
  })

  it("skips unsupported and Draft Pages then processes later pages", async () => {
    const adapter = fakeAdapter()
    const download = vi.fn()
    const batch: WeekDocument = {
      ...week,
      pages: [
        { id: "p00", layout: "future-layout", title: "Future" },
        createBlankTwoColumnPage("p01", "table"),
        { ...completePage, id: "p02" },
      ],
    }

    const skipped = await exportVisiblePages(week.start, batch, {
      adapter,
      download,
    })

    expect(
      skipped.map((entry) => [entry.pageId, entry.issues[0]?.code])
    ).toEqual([
      ["p00", "unsupported"],
      ["p01", "missing-content"],
    ])
    expect(adapter.prepare.mock.calls.map((call) => call[1].id)).toEqual([
      "p02",
    ])
    expect(download).toHaveBeenCalledOnce()
    expect(formatSkippedExportWarning(skipped)).toContain(
      "p01: title (Draft Page)"
    )
  })
})
