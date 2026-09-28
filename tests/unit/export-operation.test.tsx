import { act, render, waitFor } from "@testing-library/react"
import { useEffect } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useStageExport } from "@/hooks/use-stage-export"
import { browserCaptureAdapter } from "@/lib/browser-capture-adapter"
import { copyImageToClipboard } from "@/lib/clipboard-image"
import { downloadBlob } from "@/lib/download-blob"
import {
  createEditingSession,
  moveSessionPage,
  selectSessionPage,
  sessionOperationSnapshot,
  writeMetricInput,
  type EditingSession,
} from "@/lib/editing-session"
import { createStagePageContext } from "@/lib/stage-page-context"
import type { WeekDocument, WeekPage } from "@/lib/week-document"

vi.mock("@/lib/browser-capture-adapter", () => ({
  browserCaptureAdapter: { prepare: vi.fn() },
  assertCaptureHostAvailable: vi.fn(),
}))
vi.mock("@/lib/download-blob", () => ({ downloadBlob: vi.fn() }))
vi.mock("@/lib/clipboard-image", () => ({ copyImageToClipboard: vi.fn() }))

type Commands = ReturnType<typeof useStageExport>
type BatchRun = ReturnType<Commands["downloadVisiblePages"]>
type CopyRun = ReturnType<Commands["copyCurrentPage"]>

type HarnessProps = {
  monday: string
  week: WeekDocument
  selectedPage: WeekPage
  session?: EditingSession
}

function OperationHarness({
  monday,
  week,
  selectedPage,
  session,
  commandsRef,
}: HarnessProps & { commandsRef: { current: Commands | null } }) {
  const operation = useStageExport({
    operationSnapshot: () =>
      sessionOperationSnapshot(
        session ?? {
          ...selectSessionPage(createEditingSession(week), selectedPage.id),
          selectedMonday: monday,
        }
      ),
  })
  useEffect(() => {
    commandsRef.current = operation
  })
  return null
}

function renderOperation(props: HarnessProps) {
  const commandsRef: { current: Commands | null } = { current: null }
  const view = render(<OperationHarness {...props} commandsRef={commandsRef} />)
  return {
    commands: () => commandsRef.current!,
    rerender: (next: HarnessProps) =>
      view.rerender(<OperationHarness {...next} commandsRef={commandsRef} />),
    unmount: view.unmount,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

// Arrange 階段等待非同步前置條件成立；等待本身不是測試要驗證的行為
async function until(condition: () => boolean): Promise<void> {
  await waitFor(() => {
    if (!condition()) throw new Error("Precondition not reached yet")
  })
}

function htmlPage(id: string, title: string): WeekPage {
  return { id, layout: "html", title, htmlFile: `${id}.html` }
}

function singlePageWeek(): WeekDocument {
  return {
    start: "2026-08-24",
    end: "2026-08-28",
    pages: [htmlPage("p01", "First")],
  }
}

// p01 的 capture 停在 pending，讓測試能在批次進行中改動 Editing Session
function captureWithPendingFirstPage(firstCapture: Promise<Blob>) {
  return (page: WeekPage) =>
    page.id === "p01" ? firstCapture : Promise.resolve(new Blob(["png"]))
}

function preparedCapture(capture: () => Promise<Blob>, dispose = vi.fn()) {
  return {
    measure: async () => ({ status: "fit" as const }),
    capture,
    dispose,
  }
}

function downloadedNames(): string[] {
  return vi.mocked(downloadBlob).mock.calls.map((call) => call[1])
}

const prepare = vi.mocked(browserCaptureAdapter.prepare)

describe("export operation lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prepare.mockReset()
  })

  describe("a batch that outlives edits and a week switch", () => {
    const otherWeek: WeekDocument = {
      start: "2026-08-31",
      end: "2026-09-04",
      pages: [htmlPage("p01", "Other")],
    }

    it("exports the starting pages with their original Stage context", async () => {
      const firstCapture = deferred<Blob>()
      const capture = captureWithPendingFirstPage(firstCapture.promise)
      const week: WeekDocument = {
        start: "2026-08-18",
        end: "2026-08-22",
        pages: [htmlPage("p01", "First"), htmlPage("p02", "Second")],
      }
      const seen: string[] = []
      prepare.mockImplementation(async (document, page) => {
        const context = createStagePageContext(document, page.id)
        seen.push(
          `${page.id}:${page.title}:${context.weekLabel}:${context.pageLabel}`
        )
        return preparedCapture(() => capture(page))
      })
      const operation = renderOperation({
        monday: "2026-08-24",
        week,
        selectedPage: week.pages[0],
      })
      let batch!: BatchRun
      act(() => {
        batch = operation.commands().downloadVisiblePages()
      })
      await until(() => seen.length === 1)
      week.pages[1].title = "Edited later"
      week.pages.reverse()
      operation.rerender({
        monday: otherWeek.start,
        week: otherWeek,
        selectedPage: otherWeek.pages[0],
      })

      await act(async () => {
        firstCapture.resolve(new Blob(["png"]))
        await batch
      })

      expect(seen).toEqual([
        "p01:First:2026-08-18 — 2026-08-22:1 / 2",
        "p02:Second:2026-08-18 — 2026-08-22:2 / 2",
      ])
      expect(downloadedNames()).toEqual([
        "2026-08-24-p01.png",
        "2026-08-24-p02.png",
      ])
      expect(operation.commands().exportResult).toBe(
        "Export for 2026-08-24: Downloads triggered: 2; Skipped: 0; Failed: 0; Not attempted: 0."
      )
    })

    it("rejects an overlapping Copy while the batch is running", async () => {
      const firstCapture = deferred<Blob>()
      const capture = captureWithPendingFirstPage(firstCapture.promise)
      prepare.mockImplementation(async (_document, page) =>
        preparedCapture(() => capture(page))
      )
      const week: WeekDocument = {
        start: "2026-08-18",
        end: "2026-08-22",
        pages: [htmlPage("p01", "First"), htmlPage("p02", "Second")],
      }
      const operation = renderOperation({
        monday: "2026-08-24",
        week,
        selectedPage: week.pages[0],
      })
      act(() => {
        void operation.commands().downloadVisiblePages()
      })
      await until(() => prepare.mock.calls.length === 1)

      const copy = await operation.commands().copyCurrentPage()

      expect(copy).toEqual({ kind: "busy" })
      expect(operation.commands().exporting).toBe(true)
    })
  })

  it("exports every starting page with its original position after a page is deleted mid-batch", async () => {
    const firstCapture = deferred<Blob>()
    const capture = captureWithPendingFirstPage(firstCapture.promise)
    const week: WeekDocument = {
      start: "2026-08-18",
      end: "2026-08-22",
      pages: [htmlPage("p01", "First"), htmlPage("p02", "Second")],
    }
    const seen: string[] = []
    prepare.mockImplementation(async (document, page) => {
      seen.push(
        `${page.id}:${createStagePageContext(document, page.id).pageLabel}`
      )
      return preparedCapture(() => capture(page))
    })
    const operation = renderOperation({
      monday: "2026-08-18",
      week,
      selectedPage: week.pages[0],
    })
    let batch!: BatchRun
    act(() => {
      batch = operation.commands().downloadVisiblePages()
    })
    await until(() => seen.length === 1)
    const afterDeletion: WeekDocument = { ...week, pages: [week.pages[0]] }
    week.pages.splice(1, 1)
    operation.rerender({
      monday: "2026-08-18",
      week: afterDeletion,
      selectedPage: afterDeletion.pages[0],
    })

    await act(async () => {
      firstCapture.resolve(new Blob(["png"]))
      await batch
    })

    expect(seen).toEqual(["p01:1 / 2", "p02:2 / 2"])
    expect(downloadedNames()).toEqual([
      "2026-08-18-p01.png",
      "2026-08-18-p02.png",
    ])
  })

  describe("Metric Input fixed while a batch is running", () => {
    const monday = "2026-08-24"
    const baseline = {
      pageId: "p02",
      metricIndex: 0,
      field: "baselineValue",
    } as const
    const week: WeekDocument = {
      start: monday,
      end: "2026-08-28",
      pages: [
        htmlPage("p01", "First"),
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

    // 批次開始時 p02 的 Metric Input 非法；批次進行中修正輸入、把 p02 移到最前並選取
    async function batchStartedBeforeInputFix() {
      const firstCapture = deferred<Blob>()
      const capture = captureWithPendingFirstPage(firstCapture.promise)
      prepare.mockImplementation(async (_document, page) =>
        preparedCapture(() => capture(page))
      )
      let session = writeMetricInput(
        createEditingSession(week),
        baseline,
        "invalid"
      )
      const operation = renderOperation({
        monday,
        week,
        selectedPage: week.pages[0],
        session,
      })
      let batch!: BatchRun
      act(() => {
        batch = operation.commands().downloadVisiblePages()
      })
      await until(() => prepare.mock.calls.length === 1)
      session = writeMetricInput(session, baseline, "2.00")
      session = selectSessionPage(moveSessionPage(session, "p02", "up"), "p02")
      operation.rerender({
        monday,
        week,
        selectedPage: session.week!.pages[0],
        session,
      })
      const finishBatch = () =>
        act(async () => {
          firstCapture.resolve(new Blob(["png"]))
          await batch
        })
      return { operation, finishBatch }
    }

    it("still skips the page by its starting Metric Input", async () => {
      const { operation, finishBatch } = await batchStartedBeforeInputFix()

      await finishBatch()

      expect(operation.commands().exportResult).toContain("p02")
      expect(operation.commands().exportResult).toContain("baselineValue")
      expect(prepare).toHaveBeenCalledOnce()
    })

    it("lets the next Copy use the fixed input and the newly selected page", async () => {
      const { operation, finishBatch } = await batchStartedBeforeInputFix()
      await finishBatch()

      let copy!: Awaited<CopyRun>
      await act(async () => {
        copy = await operation.commands().copyCurrentPage()
      })

      expect(copy).toEqual({ kind: "completed" })
      expect(prepare.mock.calls.map((call) => call[1].id)).toEqual([
        "p01",
        "p02",
      ])
      expect(copyImageToClipboard).toHaveBeenCalledOnce()
      expect(operation.commands().exportResult).toBe(
        "Copied p02 from 2026-08-24 to clipboard."
      )
    })
  })

  describe("Copy awaiting the clipboard", () => {
    function renderPendingClipboard() {
      const clipboard = deferred<void>()
      prepare.mockResolvedValue(preparedCapture(async () => new Blob(["png"])))
      vi.mocked(copyImageToClipboard).mockReturnValue(clipboard.promise)
      const week = singlePageWeek()
      const operation = renderOperation({
        monday: week.start,
        week,
        selectedPage: week.pages[0],
      })
      return { operation, clipboard }
    }

    // 回傳物件包住 pending 的 Copy，避免 async 函式把 promise 攤平而一路等到 clipboard 完成
    async function startCopy(
      operation: ReturnType<typeof renderOperation>
    ): Promise<{ copy: CopyRun }> {
      let copy!: CopyRun
      act(() => {
        copy = operation.commands().copyCurrentPage()
      })
      await until(() => vi.mocked(copyImageToClipboard).mock.calls.length > 0)
      return { copy }
    }

    it("stays busy without a result until the clipboard settles", async () => {
      const { operation } = renderPendingClipboard()

      await startCopy(operation)

      expect(operation.commands().copying).toBe(true)
      expect(operation.commands().exportResult).toBeNull()
    })

    it("rejects a batch without replacing the pending result", async () => {
      const { operation } = renderPendingClipboard()
      await startCopy(operation)

      const batch = await operation.commands().downloadVisiblePages()

      expect(batch).toEqual({ kind: "busy" })
      expect(operation.commands().exportResult).toBeNull()
    })

    it("shows success once the clipboard resolves", async () => {
      const { operation, clipboard } = renderPendingClipboard()
      const { copy } = await startCopy(operation)

      await act(async () => {
        clipboard.resolve()
        await copy
      })

      expect(operation.commands().exportResult).toBe(
        "Copied p01 from 2026-08-24 to clipboard."
      )
    })

    it("ignores a completion that arrives after Workshop unmount", async () => {
      const { operation, clipboard } = renderPendingClipboard()
      const { copy } = await startCopy(operation)
      operation.unmount()

      let result!: Awaited<CopyRun>
      await act(async () => {
        clipboard.resolve()
        result = await copy
      })

      expect(result).toEqual({ kind: "disposed" })
    })
  })

  describe("a batch with a fatal download failure", () => {
    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        htmlPage("p01", "First"),
        { id: "p02", layout: "future-layout", title: "Unsupported" },
        htmlPage("p03", "Third"),
        htmlPage("p04", "Fourth"),
      ],
    }

    function renderFailingDownloads() {
      prepare.mockResolvedValue(preparedCapture(async () => new Blob(["png"])))
      vi.mocked(downloadBlob).mockImplementation((_blob, name) => {
        if (name.endsWith("p03.png")) throw new Error("Downloads blocked")
      })
      return renderOperation({
        monday: week.start,
        week,
        selectedPage: week.pages[0],
      })
    }

    it("reports prior skips with the failed and unattempted pages", async () => {
      const operation = renderFailingDownloads()

      await act(async () => {
        await operation.commands().downloadVisiblePages()
      })

      const { exportResult, resultIsError } = operation.commands()
      expect(resultIsError).toBe(true)
      expect(exportResult).toContain(
        "Downloads triggered: 1; Skipped: 1; Failed: 1; Not attempted: 1."
      )
      expect(exportResult).toContain("p02: This layout cannot be exported")
      expect(exportResult).toContain(
        "Failed page: p03: Download trigger failed: Downloads blocked"
      )
    })

    it("is replaced by the next accepted operation's result", async () => {
      const operation = renderFailingDownloads()
      await act(async () => {
        await operation.commands().downloadVisiblePages()
      })

      await act(async () => {
        await operation.commands().copyCurrentPage()
      })

      expect(operation.commands().exportResult).toBe(
        "Copied p01 from 2026-08-24 to clipboard."
      )
    })
  })

  it("labels a rejected clipboard write as an output failure rather than a page issue", async () => {
    prepare.mockResolvedValue(preparedCapture(async () => new Blob(["png"])))
    vi.mocked(copyImageToClipboard).mockRejectedValueOnce(
      new Error("Write permission denied")
    )
    const week = singlePageWeek()
    const operation = renderOperation({
      monday: week.start,
      week,
      selectedPage: week.pages[0],
    })

    await act(async () => {
      await operation.commands().copyCurrentPage()
    })

    expect(operation.commands().resultIsError).toBe(true)
    expect(operation.commands().exportResult).toBe(
      "Copy p01 from 2026-08-24: Clipboard write failed: Write permission denied"
    )
  })

  describe("a capture that times out after a week switch", () => {
    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [htmlPage("p01", "Slow"), htmlPage("p02", "Next")],
    }
    const nextWeek: WeekDocument = {
      start: "2026-08-31",
      end: "2026-09-04",
      pages: [htmlPage("p03", "New")],
    }

    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    // p01 的 capture 永不在時限內完成；開始後切到下一週，再推進時間越過 PNG 產生上限
    async function batchTimedOutAfterWeekSwitch() {
      const lateCapture = deferred<Blob>()
      const firstStarted = deferred<void>()
      prepare.mockImplementation(async (_document, page) =>
        preparedCapture(() => {
          if (page.id !== "p01") return Promise.resolve(new Blob(["png"]))
          firstStarted.resolve()
          return lateCapture.promise
        })
      )
      const operation = renderOperation({
        monday: week.start,
        week,
        selectedPage: week.pages[0],
      })
      let batch!: BatchRun
      act(() => {
        batch = operation.commands().downloadVisiblePages()
      })
      await firstStarted.promise
      operation.rerender({
        monday: nextWeek.start,
        week: nextWeek,
        selectedPage: nextWeek.pages[0],
      })
      const passTimeout = () =>
        act(async () => {
          await vi.advanceTimersByTimeAsync(15000)
          await batch
        })
      return { operation, lateCapture, passTimeout }
    }

    it("reports the timed-out page in the original-week summary", async () => {
      const { operation, passTimeout } = await batchTimedOutAfterWeekSwitch()

      await passTimeout()

      expect(operation.commands().exportResult).toContain(
        "Export for 2026-08-24: Downloads triggered: 1; Skipped: 1; Failed: 0; Not attempted: 0."
      )
      expect(downloadedNames()).toEqual(["2026-08-24-p02.png"])
    })

    it("does not download a capture that finishes after its timeout", async () => {
      const { lateCapture, passTimeout } = await batchTimedOutAfterWeekSwitch()
      await passTimeout()

      lateCapture.resolve(new Blob(["late"]))
      await Promise.resolve()

      expect(downloadBlob).toHaveBeenCalledOnce()
    })

    it("lets a later Copy use the newly opened week", async () => {
      const { operation, passTimeout } = await batchTimedOutAfterWeekSwitch()
      await passTimeout()

      await act(async () => {
        await operation.commands().copyCurrentPage()
      })

      expect(operation.commands().exportResult).toBe(
        "Copied p03 from 2026-08-31 to clipboard."
      )
    })
  })

  it("stops output and later pages after Workshop unmount", async () => {
    const firstCapture = deferred<Blob>()
    const capture = captureWithPendingFirstPage(firstCapture.promise)
    const dispose = vi.fn()
    prepare.mockImplementation(async (_document, page) =>
      preparedCapture(() => capture(page), dispose)
    )
    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [htmlPage("p01", "First"), htmlPage("p02", "Second")],
    }
    const operation = renderOperation({
      monday: week.start,
      week,
      selectedPage: week.pages[0],
    })
    let batch!: BatchRun
    act(() => {
      batch = operation.commands().downloadVisiblePages()
    })
    await until(() => prepare.mock.calls.length === 1)
    operation.unmount()

    let result!: Awaited<BatchRun>
    await act(async () => {
      firstCapture.resolve(new Blob(["png"]))
      result = await batch
    })

    expect(result).toEqual({ kind: "disposed" })
    expect(dispose).toHaveBeenCalledOnce()
    expect(downloadBlob).not.toHaveBeenCalled()
    expect(prepare).toHaveBeenCalledOnce()
  })
})
