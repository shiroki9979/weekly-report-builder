import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useEditingSession } from "@/hooks/use-editing-session"
import { createBlankEvidenceDecisionPage } from "@/lib/page-lifecycle"
import type { WeekDocument } from "@/lib/week-document"
import { InMemoryWeekStore } from "./support/in-memory-week-store"

const older = "2026-01-05"
const latest = "2026-01-12"
const next = "2026-01-19"

function week(monday: string, title = monday): WeekDocument {
  return {
    start: monday,
    end: monday,
    pages: [{ ...createBlankEvidenceDecisionPage("p01"), title }],
  }
}

function store() {
  return new InMemoryWeekStore(
    new Map([
      [older, week(older)],
      [latest, week(latest)],
    ])
  )
}

function deferred<T>() {
  let resolve!: (value: T) => void
  return {
    promise: new Promise<T>((done) => {
      resolve = done
    }),
    resolve,
  }
}

async function ready(result: {
  current: ReturnType<typeof useEditingSession>
}) {
  await waitFor(() =>
    expect(result.current.loadStatus).toEqual({ kind: "ready" })
  )
}

// 開啟最新週後啟動一次 Save，Save 在 failSave 前保持進行中，之後以 "Disk full" 失敗
async function renderWithPendingFailingSave() {
  const pending = deferred<void>()
  const backend = store()
  backend.saveWeek = async () => {
    await pending.promise
    throw new Error("Disk full")
  }
  const { result } = renderHook(() => useEditingSession(backend))
  await ready(result)
  let save!: Promise<void>
  act(() => {
    save = result.current.save.saveWeek()
  })
  const failSave = () =>
    act(async () => {
      pending.resolve()
      await save
    })
  return { result, failSave }
}

describe("useEditingSession", () => {
  it("reports saving without an open week", async () => {
    const backend = new InMemoryWeekStore()
    const { result } = renderHook(() => useEditingSession(backend))
    await waitFor(() =>
      expect(result.current.loadStatus).toEqual({ kind: "empty" })
    )

    await act(() => result.current.save.saveWeek())
    expect(result.current.save.error).toBe("No week is open")
  })

  it("opens the latest listed week and suggests the following Monday", async () => {
    const backend = store()
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)
    expect(result.current.selectedMonday).toBe(latest)
    expect(result.current.week?.start).toBe(latest)
    expect(result.current.suggestedMonday).toBe(next)
  })

  it("shows an empty store without an open week", async () => {
    const backend = new InMemoryWeekStore()

    const { result } = renderHook(() => useEditingSession(backend))

    await waitFor(() =>
      expect(result.current.loadStatus).toEqual({ kind: "empty" })
    )
    expect(result.current.week).toBeNull()
  })

  it("shows a list failure as an error without an open week", async () => {
    const backend = new InMemoryWeekStore()
    backend.listWeeks = async () => {
      throw new Error("List unavailable")
    }

    const { result } = renderHook(() => useEditingSession(backend))

    await waitFor(() =>
      expect(result.current.loadStatus).toEqual({
        kind: "error",
        message: "List unavailable",
      })
    )
    expect(result.current.week).toBeNull()
  })

  it("keeps exact Metric Input and selection after saving", async () => {
    const backend = store()
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)
    act(() =>
      result.current.metricInputControls.comparisonMetric.write(
        { pageId: "p01", metricIndex: 0, field: "baselineValue" },
        "1.50"
      )
    )

    await act(() => result.current.save.saveWeek())

    expect(result.current.save.message).toBe("Saved")
    expect(
      result.current.metricInputControls.comparisonMetric.read({
        pageId: "p01",
        metricIndex: 0,
        field: "baselineValue",
      })
    ).toBe("1.50")
    expect(result.current.selectedPageId).toBe("p01")
  })

  it("clears the Saved message and the open week while another week loads", async () => {
    const backend = store()
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)
    await act(() => result.current.save.saveWeek())
    backend.loadWeek = () => new Promise<WeekDocument>(() => {})

    act(() => result.current.setSelectedMonday(older))

    expect(result.current.loadStatus).toEqual({ kind: "loading" })
    expect(result.current.save.message).toBeNull()
    expect(result.current.week).toBeNull()
  })

  it("clears the Saved message and Metric Input when another week opens", async () => {
    const backend = store()
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)
    act(() =>
      result.current.metricInputControls.comparisonMetric.write(
        { pageId: "p01", metricIndex: 0, field: "baselineValue" },
        "1.50"
      )
    )
    await act(() => result.current.save.saveWeek())

    act(() => result.current.setSelectedMonday(older))
    await ready(result)

    expect(result.current.week?.start).toBe(older)
    expect(result.current.save.message).toBeNull()
    expect(result.current.operationSnapshot()?.metricInput).toEqual({})
  })

  it("clears invalid save errors when another week opens", async () => {
    const backend = store()
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)
    act(() =>
      result.current.metricInputControls.comparisonMetric.write(
        { pageId: "p01", metricIndex: 0, field: "baselineValue" },
        "bad"
      )
    )
    await act(() => result.current.save.saveWeek())
    expect(result.current.save.error).toBe(
      "Fix invalid metric values before saving"
    )
    act(() => result.current.setSelectedMonday(older))
    expect(result.current.save.error).toBeNull()
    await ready(result)
  })

  it("ignores a save finishing after a switch through A → B → A", async () => {
    const pending = deferred<void>()
    const backend = store()
    const originalSave = backend.saveWeek.bind(backend)
    backend.saveWeek = async (monday, document) => {
      await pending.promise
      await originalSave(monday, document)
    }
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)
    let save!: Promise<void>
    act(() => {
      save = result.current.save.saveWeek()
    })
    expect(result.current.save.saving).toBe(true)
    act(() => result.current.setSelectedMonday(older))
    await waitFor(() => expect(result.current.week?.start).toBe(older))
    act(() => result.current.setSelectedMonday(latest))
    await waitFor(() => expect(result.current.week?.start).toBe(latest))
    await act(async () => {
      pending.resolve()
      await save
    })
    expect(result.current.save.message).toBeNull()
    expect(result.current.save.saving).toBe(false)
  })

  it("creates a week and opens it without earlier messages or input", async () => {
    const backend = store()
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)
    act(() =>
      result.current.metricInputControls.comparisonMetric.write(
        { pageId: "p01", metricIndex: 0, field: "baselineValue" },
        "1.50"
      )
    )
    await act(() => result.current.save.saveWeek())
    await act(() => result.current.create.createWeek(next))
    expect(result.current.selectedMonday).toBe(next)
    expect(result.current.week?.start).toBe(next)
    expect(result.current.weeks).toContain(next)
    expect(result.current.save.message).toBeNull()
    expect(result.current.operationSnapshot()?.metricInput).toEqual({})
    expect(result.current.create.creating).toBe(false)
  })

  it("reports create failure without changing the open week", async () => {
    const backend = store()
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)
    await act(() => result.current.create.createWeek(latest))
    expect(result.current.create.error).toBe(`Week already exists: ${latest}`)
    expect(result.current.week?.start).toBe(latest)
    expect(result.current.create.creating).toBe(false)
    act(() => result.current.setSelectedMonday(older))
    expect(result.current.create.error).toBeNull()
    await waitFor(() => expect(result.current.week?.start).toBe(older))
  })

  it("reports a save failure that finishes after a failed create on the same week", async () => {
    const { result, failSave } = await renderWithPendingFailingSave()

    await act(() => result.current.create.createWeek(latest))
    await failSave()

    expect(result.current.week?.start).toBe(latest)
    expect(result.current.create.error).toBe(`Week already exists: ${latest}`)
    expect(result.current.save.error).toBe("Disk full")
    expect(result.current.save.saving).toBe(false)
  })

  it("ignores a save that finishes after a created week opens", async () => {
    const { result, failSave } = await renderWithPendingFailingSave()

    await act(() => result.current.create.createWeek(next))
    await failSave()

    expect(result.current.week?.start).toBe(next)
    expect(result.current.save.error).toBeNull()
    expect(result.current.save.saving).toBe(false)
  })

  it("logs a save failure that finishes after a created week opens", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { result, failSave } = await renderWithPendingFailingSave()

    await act(() => result.current.create.createWeek(next))
    await failSave()

    expect(warn).toHaveBeenCalledWith(
      `Discarded stale failure: save week ${latest}`,
      new Error("Disk full")
    )
    warn.mockRestore()
  })

  it("ignores a late create after switching weeks without listing weeks", async () => {
    const pending = deferred<WeekDocument>()
    const backend = store()
    backend.createWeekFromPrevious = () => pending.promise
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)
    const listWeeks = backend.listWeeks.bind(backend)
    let listCalls = 0
    backend.listWeeks = () => {
      listCalls++
      return listWeeks()
    }
    let create!: Promise<void>
    act(() => {
      create = result.current.create.createWeek(next)
    })
    act(() => result.current.setSelectedMonday(older))
    await waitFor(() => expect(result.current.week?.start).toBe(older))
    await act(async () => {
      pending.resolve(week(next))
      await create
    })
    expect(result.current.selectedMonday).toBe(older)
    expect(result.current.create.error).toBeNull()
    expect(result.current.create.creating).toBe(false)
    expect(listCalls).toBe(0)
  })
})
