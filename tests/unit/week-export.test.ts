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
  it("blocks an explicit HTML load failure before PNG capture", async () => {
    const capture = vi.fn()
    const page = {
      id: "html",
      layout: "html" as const,
      title: "",
      htmlFile: "missing.html",
    }
    const result = await exportPage({ ...week, pages: [page] }, page, {
      prepare: async () => ({
        kind: "html-load-failed",
        message: "Failed to load HTML file: missing.html (status 404)",
      }),
    })

    expect(result).toEqual({
      kind: "blocked",
      issues: [
        {
          code: "html-load-failed",
          message: "Failed to load HTML file: missing.html (status 404)",
        },
      ],
    })
    expect(capture).not.toHaveBeenCalled()
  })

  it.each(["html", "structured"])(
    "blocks %s PNG rejection and disposes the session",
    async (kind) => {
      const page =
        kind === "html"
          ? {
              id: "html",
              layout: "html" as const,
              title: "",
              htmlFile: "ok.html",
            }
          : completePage
      const dispose = vi.fn()
      const result = await exportPage({ ...week, pages: [page] }, page, {
        prepare: async () => ({
          measure: async () => ({ status: "fit" }),
          capture: async () => {
            throw new Error("PNG encoder rejected")
          },
          dispose,
        }),
      })

      expect(result).toEqual({
        kind: "blocked",
        issues: [{ code: "capture-failed", message: "PNG encoder rejected" }],
      })
      expect(dispose).toHaveBeenCalledOnce()
    }
  )

  it("bounds a hung measurement at five seconds and a hung capture at fifteen seconds", async () => {
    vi.useFakeTimers()
    try {
      const measure = exportPage(week, completePage, {
        prepare: async () => ({
          measure: () => new Promise(() => undefined),
          capture: async () => new Blob(),
          dispose: vi.fn(),
        }),
      })
      await vi.advanceTimersByTimeAsync(5000)
      expect(await measure).toMatchObject({
        kind: "blocked",
        issues: [{ code: "measurement-failed" }],
      })

      const capture = exportPage(week, completePage, {
        prepare: async () => ({
          measure: async () => ({ status: "fit" }),
          capture: () => new Promise(() => undefined),
          dispose: vi.fn(),
        }),
      })
      await vi.advanceTimersByTimeAsync(15000)
      expect(await capture).toMatchObject({
        kind: "blocked",
        issues: [{ code: "capture-failed" }],
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it("discards a timed-out PNG even when it resolves after the next page succeeds", async () => {
    vi.useFakeTimers()
    try {
      let resolveLate!: (blob: Blob) => void
      const lateCapture = new Promise<Blob>((resolve) => {
        resolveLate = resolve
      })
      const download = vi.fn()
      const dispose = vi.fn()
      const adapter: CaptureAdapter = {
        prepare: async (_week, page) => ({
          measure: async () => ({ status: "fit" }),
          capture: () =>
            page.id === "p01"
              ? lateCapture
              : Promise.resolve(new Blob(["next"])),
          dispose,
        }),
      }
      const run = exportVisiblePages(week.start, week, { adapter, download })
      await vi.advanceTimersByTimeAsync(15000)
      const skipped = await run
      resolveLate(new Blob(["late"]))
      await Promise.resolve()

      expect(skipped).toMatchObject([
        { pageId: "p01", issues: [{ code: "capture-failed" }] },
      ])
      expect(download.mock.calls.map((call) => call[1])).toEqual([
        "2026-08-24-p03.png",
      ])
      expect(dispose).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it("handles late PNG rejection after timeout without stopping the next page", async () => {
    vi.useFakeTimers()
    try {
      let rejectLate!: (error: Error) => void
      const lateCapture = new Promise<Blob>((_resolve, reject) => {
        rejectLate = reject
      })
      const download = vi.fn()
      const adapter: CaptureAdapter = {
        prepare: async (_week, page) => ({
          measure: async () => ({ status: "fit" }),
          capture: () =>
            page.id === "p01"
              ? lateCapture
              : Promise.resolve(new Blob(["next"])),
          dispose: vi.fn(),
        }),
      }
      const run = exportVisiblePages(week.start, week, { adapter, download })
      await vi.advanceTimersByTimeAsync(15000)
      await run
      rejectLate(new Error("Too late"))
      await Promise.resolve()

      expect(download.mock.calls.map((call) => call[1])).toEqual([
        "2026-08-24-p03.png",
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it("disposes a capture session immediately when the operation aborts", async () => {
    const controller = new AbortController()
    const dispose = vi.fn()
    let resolveLate!: (blob: Blob) => void
    let started!: () => void
    const captureStarted = new Promise<void>((resolve) => {
      started = resolve
    })
    const capture = new Promise<Blob>((resolve) => {
      resolveLate = resolve
    })
    const run = exportPage(
      week,
      completePage,
      {
        prepare: async () => ({
          measure: async () => ({ status: "fit" }),
          capture: () => {
            started()
            return capture
          },
          dispose,
        }),
      },
      {},
      controller.signal
    )
    await captureStarted
    controller.abort()

    expect(await run).toMatchObject({
      kind: "failed",
      cause: { name: "AbortError" },
    })
    expect(dispose).toHaveBeenCalledOnce()
    resolveLate(new Blob(["late"]))
    await Promise.resolve()
    expect(dispose).toHaveBeenCalledOnce()
  })

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

  it("returns a page issue and disposes a failed capture", async () => {
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
      kind: "blocked",
      issues: [{ code: "capture-failed", message: failure.message }],
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
      "p01: title: Title is required"
    )
  })
})
