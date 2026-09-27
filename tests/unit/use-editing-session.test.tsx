import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useEditingSession } from "@/hooks/use-editing-session"
import { createBlankEvidenceDecisionPage } from "@/lib/page-lifecycle"
import type { WeekDocument } from "@/lib/week-document"
import { InMemoryWeekStore } from "@/lib/week-store"

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

describe("useEditingSession", () => {
  it("opens the latest listed week and suggests the following Monday", async () => {
    const backend = store()
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)
    expect(result.current.selectedMonday).toBe(latest)
    expect(result.current.week?.start).toBe(latest)
    expect(result.current.suggestedMonday).toBe(next)
  })

  it("shows an empty store separately from a list failure", async () => {
    const emptyStore = new InMemoryWeekStore()
    const empty = renderHook(() => useEditingSession(emptyStore))
    await waitFor(() =>
      expect(empty.result.current.loadStatus).toEqual({ kind: "empty" })
    )
    expect(empty.result.current.week).toBeNull()
    empty.unmount()

    const failingStore = new InMemoryWeekStore()
    failingStore.listWeeks = async () => {
      throw new Error("List unavailable")
    }
    const failed = renderHook(() => useEditingSession(failingStore))
    await waitFor(() =>
      expect(failed.result.current.loadStatus).toEqual({
        kind: "error",
        message: "List unavailable",
      })
    )
    expect(failed.result.current.week).toBeNull()
  })

  it("keeps exact Metric Input and selection after saving, then clears messages and input on switch", async () => {
    const backend = store()
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)
    act(() =>
      result.current.writeMetricInput("p01", 0, "baselineValue", "1.50")
    )
    await act(() => result.current.save.saveWeek())
    expect(result.current.save.message).toBe("Saved")
    expect(result.current.readMetricInput("p01", 0, "baselineValue")).toBe(
      "1.50"
    )
    expect(result.current.selectedPageId).toBe("p01")
    act(() => result.current.setSelectedMonday(older))
    expect(result.current.save.message).toBeNull()
    expect(result.current.week).toBeNull()
    await ready(result)
    expect(result.current.operationSnapshot()?.metricInput).toEqual({})
    expect(result.current.week?.start).toBe(older)
  })

  it("clears invalid save errors when another week opens", async () => {
    const backend = store()
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)
    act(() => result.current.writeMetricInput("p01", 0, "baselineValue", "bad"))
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
      result.current.writeMetricInput("p01", 0, "baselineValue", "1.50")
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

  it("ignores a late create after switching weeks", async () => {
    const pending = deferred<WeekDocument>()
    const backend = store()
    backend.createWeekFromPrevious = () => pending.promise
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)
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
  })
})
