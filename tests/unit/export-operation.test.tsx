import { act, render, waitFor } from "@testing-library/react"
import { useEffect } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useStageExport } from "@/hooks/use-stage-export"
import { browserCaptureAdapter } from "@/lib/browser-capture-adapter"
import { copyImageToClipboard } from "@/lib/clipboard-image"
import { downloadBlob } from "@/lib/download-blob"
import type { MetricDraftBuffer } from "@/lib/metric-draft-buffer"
import { createStagePageContext } from "@/lib/stage-page-context"
import type { WeekDocument, WeekPage } from "@/lib/week-document"

vi.mock("@/lib/browser-capture-adapter", () => ({
  browserCaptureAdapter: { prepare: vi.fn() },
}))
vi.mock("@/lib/download-blob", () => ({ downloadBlob: vi.fn() }))
vi.mock("@/lib/clipboard-image", () => ({ copyImageToClipboard: vi.fn() }))

type Commands = ReturnType<typeof useStageExport>

function OperationHarness({
  monday,
  week,
  selectedPage,
  metricBuffer,
  commandsRef,
}: {
  monday: string
  week: WeekDocument
  selectedPage: WeekPage
  metricBuffer?: MetricDraftBuffer
  commandsRef: { current: Commands | null }
}) {
  const operation = useStageExport({ monday, week, selectedPage, metricBuffer })
  useEffect(() => {
    commandsRef.current = operation
  })
  return null
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

describe("export operation commandsRef", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(browserCaptureAdapter.prepare).mockReset()
  })

  it("keeps the starting week, page order, and Stage context after an edit and week switch; rejects overlapping Copy", async () => {
    const firstCapture = deferred<Blob>()
    const week: WeekDocument = {
      start: "2026-08-18",
      end: "2026-08-22",
      pages: [
        { id: "p01", layout: "html", title: "First", htmlFile: "first.html" },
        { id: "p02", layout: "html", title: "Second", htmlFile: "second.html" },
      ],
    }
    const seen: string[] = []
    vi.mocked(browserCaptureAdapter.prepare).mockImplementation(
      async (document, page) => {
        const context = createStagePageContext(document, page.id)
        seen.push(
          `${page.id}:${page.title}:${context.weekLabel}:${context.pageLabel}`
        )
        return {
          measure: async () => ({ status: "fit" }),
          capture: () =>
            page.id === "p01"
              ? firstCapture.promise
              : Promise.resolve(new Blob(["png"])),
          dispose: vi.fn(),
        }
      }
    )
    const commandsRef: { current: Commands | null } = { current: null }
    const view = render(
      <OperationHarness
        monday="2026-08-24"
        week={week}
        selectedPage={week.pages[0]}
        commandsRef={commandsRef}
      />
    )

    let batch!: ReturnType<Commands["downloadVisiblePages"]>
    act(() => {
      batch = commandsRef.current!.downloadVisiblePages()
    })
    await waitFor(() => expect(seen).toHaveLength(1))

    week.pages[1].title = "Edited later"
    week.pages.reverse()
    const otherWeek: WeekDocument = {
      start: "2026-08-31",
      end: "2026-09-04",
      pages: [
        { id: "p01", layout: "html", title: "Other", htmlFile: "other.html" },
      ],
    }
    view.rerender(
      <OperationHarness
        monday="2026-08-31"
        week={otherWeek}
        selectedPage={otherWeek.pages[0]}
        commandsRef={commandsRef}
      />
    )
    expect(await commandsRef.current!.copyCurrentPage()).toEqual({
      kind: "busy",
    })
    expect(commandsRef.current!.exporting).toBe(true)

    await act(async () => {
      firstCapture.resolve(new Blob(["png"]))
      await batch
    })

    expect(seen).toEqual([
      "p01:First:2026-08-18 — 2026-08-22:1 / 2",
      "p02:Second:2026-08-18 — 2026-08-22:2 / 2",
    ])
    expect(vi.mocked(downloadBlob).mock.calls.map((call) => call[1])).toEqual([
      "2026-08-24-p01.png",
      "2026-08-24-p02.png",
    ])
    expect(commandsRef.current!.exportResult).toBe(
      "Export for 2026-08-24: Downloads triggered: 2; Skipped: 0; Failed: 0; Not attempted: 0."
    )
  })

  it("keeps raw metric drafts and selects a fresh Copy target after the previous operation", async () => {
    const firstCapture = deferred<Blob>()
    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        { id: "p01", layout: "html", title: "First", htmlFile: "first.html" },
        {
          id: "p02",
          layout: "evidence-decision",
          title: "Decision",
          verdict: "Adopt",
          metrics: [
            {
              label: "Days",
              baselineValue: 9,
              candidateValue: 5,
              unit: "days",
              unitPosition: "after",
              unitSpacing: "space",
              precision: 0,
            },
          ],
          interpretations: ["Faster"],
        },
      ],
    }
    const prepare = vi.mocked(browserCaptureAdapter.prepare)
    prepare.mockImplementation(async (_document, page) => ({
      measure: async () => ({ status: "fit" }),
      capture: () =>
        page.id === "p01"
          ? firstCapture.promise
          : Promise.resolve(new Blob(["png"])),
      dispose: vi.fn(),
    }))
    const commandsRef: { current: Commands | null } = { current: null }
    const view = render(
      <OperationHarness
        monday="2026-08-24"
        week={week}
        selectedPage={week.pages[0]}
        metricBuffer={{ p02: { "metrics[0].baselineValue": "invalid" } }}
        commandsRef={commandsRef}
      />
    )
    let batch!: ReturnType<Commands["downloadVisiblePages"]>
    act(() => {
      batch = commandsRef.current!.downloadVisiblePages()
    })
    await waitFor(() => expect(prepare).toHaveBeenCalledOnce())

    view.rerender(
      <OperationHarness
        monday="2026-08-24"
        week={week}
        selectedPage={week.pages[1]}
        metricBuffer={{}}
        commandsRef={commandsRef}
      />
    )
    await act(async () => {
      firstCapture.resolve(new Blob(["png"]))
      await batch
    })
    expect(commandsRef.current!.exportWarning).toContain("p02")
    expect(commandsRef.current!.exportWarning).toContain("baselineValue")
    expect(prepare).toHaveBeenCalledOnce()

    await act(async () => {
      expect(await commandsRef.current!.copyCurrentPage()).toEqual({
        kind: "completed",
      })
    })
    expect(prepare.mock.calls.map((call) => call[1].id)).toEqual(["p01", "p02"])
    expect(copyImageToClipboard).toHaveBeenCalledOnce()
    expect(commandsRef.current!.exportResult).toBe(
      "Copied p02 from 2026-08-24 to clipboard."
    )
  })

  it("shows Copy success only after the clipboard resolves and preserves the busy result", async () => {
    const clipboard = deferred<void>()
    vi.mocked(browserCaptureAdapter.prepare).mockResolvedValue({
      measure: async () => ({ status: "fit" }),
      capture: async () => new Blob(["png"]),
      dispose: vi.fn(),
    })
    vi.mocked(copyImageToClipboard).mockReturnValue(clipboard.promise)
    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        { id: "p01", layout: "html", title: "First", htmlFile: "first.html" },
      ],
    }
    const commandsRef: { current: Commands | null } = { current: null }
    render(
      <OperationHarness
        monday={week.start}
        week={week}
        selectedPage={week.pages[0]}
        commandsRef={commandsRef}
      />
    )

    let copy!: ReturnType<Commands["copyCurrentPage"]>
    act(() => {
      copy = commandsRef.current!.copyCurrentPage()
    })
    await waitFor(() => expect(copyImageToClipboard).toHaveBeenCalledOnce())
    expect(commandsRef.current!.exportResult).toBeNull()
    expect(await commandsRef.current!.downloadVisiblePages()).toEqual({
      kind: "busy",
    })
    expect(commandsRef.current!.exportResult).toBeNull()

    await act(async () => {
      clipboard.resolve()
      await copy
    })
    expect(commandsRef.current!.exportResult).toBe(
      "Copied p01 from 2026-08-24 to clipboard."
    )
  })

  it("shows prior skips with a fatal page and replaces the result on the next accepted operation", async () => {
    vi.mocked(browserCaptureAdapter.prepare).mockResolvedValue({
      measure: async () => ({ status: "fit" }),
      capture: async () => new Blob(["png"]),
      dispose: vi.fn(),
    })
    vi.mocked(downloadBlob).mockImplementation((_blob, name) => {
      if (name.endsWith("p03.png")) throw new Error("Downloads blocked")
    })
    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        { id: "p01", layout: "html", title: "First", htmlFile: "first.html" },
        { id: "p02", layout: "future-layout", title: "Unsupported" },
        { id: "p03", layout: "html", title: "Third", htmlFile: "third.html" },
        { id: "p04", layout: "html", title: "Fourth", htmlFile: "fourth.html" },
      ],
    }
    const commandsRef: { current: Commands | null } = { current: null }
    render(
      <OperationHarness
        monday={week.start}
        week={week}
        selectedPage={week.pages[0]}
        commandsRef={commandsRef}
      />
    )

    await act(async () => {
      await commandsRef.current!.downloadVisiblePages()
    })
    expect(commandsRef.current!.resultIsError).toBe(true)
    expect(commandsRef.current!.exportResult).toContain(
      "Downloads triggered: 1; Skipped: 1; Failed: 1; Not attempted: 1."
    )
    expect(commandsRef.current!.exportResult).toContain(
      "p02: This layout cannot be exported"
    )
    expect(commandsRef.current!.exportResult).toContain(
      "Failed page: p03: Downloads blocked"
    )

    await act(async () => {
      await commandsRef.current!.copyCurrentPage()
    })
    expect(commandsRef.current!.exportResult).toBe(
      "Copied p01 from 2026-08-24 to clipboard."
    )
  })

  it("keeps timed-out output out of the original-week summary after a week switch and later Copy", async () => {
    vi.useFakeTimers()
    try {
      const lateCapture = deferred<Blob>()
      const firstStarted = deferred<void>()
      vi.mocked(browserCaptureAdapter.prepare).mockImplementation(
        async (_document, page) => ({
          measure: async () => ({ status: "fit" }),
          capture: () => {
            if (page.id === "p01") {
              firstStarted.resolve()
              return lateCapture.promise
            }
            return Promise.resolve(new Blob(["png"]))
          },
          dispose: vi.fn(),
        })
      )
      const week: WeekDocument = {
        start: "2026-08-24",
        end: "2026-08-28",
        pages: [
          { id: "p01", layout: "html", title: "Slow", htmlFile: "slow.html" },
          { id: "p02", layout: "html", title: "Next", htmlFile: "next.html" },
        ],
      }
      const nextWeek: WeekDocument = {
        start: "2026-08-31",
        end: "2026-09-04",
        pages: [
          { id: "p03", layout: "html", title: "New", htmlFile: "new.html" },
        ],
      }
      const commandsRef: { current: Commands | null } = { current: null }
      const view = render(
        <OperationHarness
          monday={week.start}
          week={week}
          selectedPage={week.pages[0]}
          commandsRef={commandsRef}
        />
      )
      let batch!: ReturnType<Commands["downloadVisiblePages"]>
      act(() => {
        batch = commandsRef.current!.downloadVisiblePages()
      })
      await firstStarted.promise
      view.rerender(
        <OperationHarness
          monday={nextWeek.start}
          week={nextWeek}
          selectedPage={nextWeek.pages[0]}
          commandsRef={commandsRef}
        />
      )
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15000)
        await batch
      })

      expect(commandsRef.current!.exportResult).toContain(
        "Export for 2026-08-24: Downloads triggered: 1; Skipped: 1; Failed: 0; Not attempted: 0."
      )
      expect(vi.mocked(downloadBlob).mock.calls.map((call) => call[1])).toEqual(
        ["2026-08-24-p02.png"]
      )
      lateCapture.resolve(new Blob(["late"]))
      await Promise.resolve()
      expect(downloadBlob).toHaveBeenCalledOnce()

      await act(async () => {
        await commandsRef.current!.copyCurrentPage()
      })
      expect(commandsRef.current!.exportResult).toBe(
        "Copied p03 from 2026-08-31 to clipboard."
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it("stops output and later pages after Workshop unmount", async () => {
    const firstCapture = deferred<Blob>()
    const dispose = vi.fn()
    vi.mocked(browserCaptureAdapter.prepare).mockImplementation(
      async (_document, page) => ({
        measure: async () => ({ status: "fit" }),
        capture: () =>
          page.id === "p01"
            ? firstCapture.promise
            : Promise.resolve(new Blob(["png"])),
        dispose,
      })
    )
    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        { id: "p01", layout: "html", title: "First", htmlFile: "first.html" },
        { id: "p02", layout: "html", title: "Second", htmlFile: "second.html" },
      ],
    }
    const commandsRef: { current: Commands | null } = { current: null }
    const view = render(
      <OperationHarness
        monday={week.start}
        week={week}
        selectedPage={week.pages[0]}
        commandsRef={commandsRef}
      />
    )
    let batch!: ReturnType<Commands["downloadVisiblePages"]>
    act(() => {
      batch = commandsRef.current!.downloadVisiblePages()
    })
    await waitFor(() =>
      expect(browserCaptureAdapter.prepare).toHaveBeenCalledOnce()
    )
    view.unmount()

    await act(async () => {
      firstCapture.resolve(new Blob(["png"]))
      expect(await batch).toEqual({ kind: "disposed" })
    })
    expect(dispose).toHaveBeenCalledOnce()
    expect(downloadBlob).not.toHaveBeenCalled()
    expect(browserCaptureAdapter.prepare).toHaveBeenCalledOnce()
  })

  it("keeps Copy busy until clipboard settles and ignores a late completion after unmount", async () => {
    const clipboard = deferred<void>()
    vi.mocked(browserCaptureAdapter.prepare).mockResolvedValue({
      measure: async () => ({ status: "fit" }),
      capture: async () => new Blob(["png"]),
      dispose: vi.fn(),
    })
    vi.mocked(copyImageToClipboard).mockReturnValue(clipboard.promise)
    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        { id: "p01", layout: "html", title: "First", htmlFile: "first.html" },
      ],
    }
    const commandsRef: { current: Commands | null } = { current: null }
    const view = render(
      <OperationHarness
        monday={week.start}
        week={week}
        selectedPage={week.pages[0]}
        commandsRef={commandsRef}
      />
    )
    let copy!: ReturnType<Commands["copyCurrentPage"]>
    act(() => {
      copy = commandsRef.current!.copyCurrentPage()
    })
    await waitFor(() => expect(copyImageToClipboard).toHaveBeenCalledOnce())
    expect(await commandsRef.current!.downloadVisiblePages()).toEqual({
      kind: "busy",
    })
    expect(commandsRef.current!.copying).toBe(true)

    view.unmount()
    await act(async () => {
      clipboard.resolve()
      expect(await copy).toEqual({ kind: "disposed" })
    })
    expect(downloadBlob).not.toHaveBeenCalled()
  })
})
