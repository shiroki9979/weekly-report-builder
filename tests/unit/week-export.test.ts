import { describe, expect, it, vi } from "vitest"

import type { CaptureAdapter } from "@/lib/export-page-gate"
import { createBlankTwoColumnPage } from "@/lib/page-lifecycle"
import type { WeekDocument } from "@/lib/week-document"
import {
  exportFileName,
  exportVisiblePages,
  formatBatchExportResult,
  formatSkippedExportWarning,
} from "@/lib/week-export"

import { completePage, week, fakeAdapter } from "./export-fixtures"

describe("batch export", () => {
  it("accounts for three downloads, two skips, one failed page, four not attempted, and excludes Hidden", async () => {
    const pages = Array.from({ length: 10 }, (_, index) => ({
      id: `p${String(index + 1).padStart(2, "0")}`,
      layout: "html" as const,
      title: `Page ${index + 1}`,
      htmlFile: "ok.html",
    }))
    const batch: WeekDocument = {
      ...week,
      pages: [
        ...pages.slice(0, 5),
        { ...pages[0], id: "hidden", hidden: true },
        ...pages.slice(5),
      ],
    }
    const adapter: CaptureAdapter = {
      prepare: async (_document, page) =>
        page.id === "p02" || page.id === "p04"
          ? { kind: "html-load-failed", message: "HTTP 404" }
          : {
              measure: async () => ({ status: "fit" }),
              capture: async () => new Blob(["png"]),
              dispose: vi.fn(),
            },
    }
    const download = vi.fn((_blob: Blob, fileName: string) => {
      if (fileName.endsWith("p06.png")) throw new Error("Downloads blocked")
    })

    const result = await exportVisiblePages(week.start, batch, {
      adapter,
      download,
    })

    expect(result).toMatchObject({
      monday: "2026-08-24",
      selectedCount: 10,
      downloadsTriggered: 3,
      failed: {
        pageId: "p06",
        reason: "Download trigger failed: Downloads blocked",
      },
      notAttempted: 4,
      stopReason: "Download trigger failed: Downloads blocked",
    })
    expect(result.skipped.map((entry) => entry.pageId)).toEqual(["p02", "p04"])
    expect(
      result.downloadsTriggered +
        result.skipped.length +
        1 +
        result.notAttempted
    ).toBe(10)
    expect(download.mock.calls.map((call) => call[1])).toEqual([
      "2026-08-24-p01.png",
      "2026-08-24-p03.png",
      "2026-08-24-p05.png",
      "2026-08-24-p06.png",
    ])
  })

  it("reports zero downloads for an empty selection and an all-skipped selection", async () => {
    const adapter = fakeAdapter()
    const download = vi.fn()
    const empty = await exportVisiblePages(
      week.start,
      {
        ...week,
        pages: [{ ...completePage, hidden: true }],
      },
      { adapter, download }
    )
    const skipped = await exportVisiblePages(
      week.start,
      {
        ...week,
        pages: [createBlankTwoColumnPage("draft", "table")],
      },
      { adapter, download }
    )

    expect(empty).toMatchObject({
      selectedCount: 0,
      downloadsTriggered: 0,
      notAttempted: 0,
    })
    expect(skipped).toMatchObject({
      selectedCount: 1,
      downloadsTriggered: 0,
      notAttempted: 0,
    })
    expect(skipped.skipped).toHaveLength(1)
    expect(download).not.toHaveBeenCalled()
    expect(formatBatchExportResult(empty)).toContain("Downloads triggered: 0")
    expect(formatBatchExportResult(skipped)).toContain("Downloads triggered: 0")
  })

  it("leaves all selected pages not attempted when setup fails before the first page", async () => {
    const adapter = fakeAdapter()
    const result = await exportVisiblePages(week.start, week, {
      adapter,
      download: vi.fn(),
      beforePages: () => {
        throw new Error("Capture host unavailable")
      },
    })

    expect(result).toMatchObject({
      selectedCount: 2,
      downloadsTriggered: 0,
      skipped: [],
      failed: null,
      notAttempted: 2,
      stopReason: "Capture host unavailable",
    })
    expect(adapter.prepare).not.toHaveBeenCalled()
  })

  it("preserves filenames and numbering gaps while silently excluding Hidden Pages", async () => {
    const adapter = fakeAdapter()
    const download = vi.fn()

    const result = await exportVisiblePages("2026-08-24", week, {
      adapter,
      download,
    })

    expect(result.skipped).toEqual([])
    expect(result.downloadsTriggered).toBe(2)
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

    const result = await exportVisiblePages(week.start, batch, {
      adapter,
      download,
    })

    expect(
      result.skipped.map((entry) => [entry.pageId, entry.issues[0]?.code])
    ).toEqual([
      ["p00", "unsupported"],
      ["p01", "missing-content"],
    ])
    expect(adapter.prepare.mock.calls.map((call) => call[1].id)).toEqual([
      "p02",
    ])
    expect(download).toHaveBeenCalledOnce()
    expect(formatSkippedExportWarning(result.skipped)).toContain(
      "p01: title: Title is required"
    )
  })
})
