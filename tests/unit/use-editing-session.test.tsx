import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useEditingSession } from "@/hooks/use-editing-session"
import { createBlankEvidenceDecisionPage } from "@/lib/page-lifecycle"
import type { Deck } from "@/lib/deck"
import { deferred, until } from "./support/async"
import { InMemoryWorkshopStore } from "./support/in-memory-deck-store"

const older = "2026-01-05"
const latest = "2026-01-12"
const next = "2026-01-19"

function week(monday: string, title = monday): Deck {
  return {
    period: { start: monday, end: monday },
    pages: [{ ...createBlankEvidenceDecisionPage("p01"), title }],
  }
}

function store() {
  return new InMemoryWorkshopStore(
    new Map([
      [older, week(older)],
      [latest, week(latest)],
    ])
  )
}

type HookResult = { current: ReturnType<typeof useEditingSession> }

async function ready(result: HookResult) {
  await until(() => result.current.loadStatus.kind === "ready")
}

async function openedWeek(result: HookResult, monday: string) {
  await until(() => result.current.deck?.period?.start === monday)
}

// 開啟最新週後啟動一次 Save，Save 在 failSave 前保持進行中，之後以 "Disk full" 失敗
async function renderWithPendingFailingSave() {
  const pending = deferred<void>()
  const backend = store()
  backend.saveDeck = async () => {
    await pending.promise
    throw new Error("Disk full")
  }
  const { result } = renderHook(() => useEditingSession(backend))
  await ready(result)
  let save!: Promise<void>
  act(() => {
    save = result.current.save.saveDeck()
  })
  const failSave = () =>
    act(async () => {
      pending.resolve()
      await save
    })
  return { result, failSave }
}

describe("useEditingSession", () => {
  describe("deck url", () => {
    it("opens the deck named in the url instead of the latest", async () => {
      window.history.replaceState(null, "", `/?deck=${older}`)
      const { result } = renderHook(() => useEditingSession(store()))

      await openedWeek(result, older)
    })

    it("writes the default deck into the url without adding history", async () => {
      const before = window.history.length
      const { result } = renderHook(() => useEditingSession(store()))
      await ready(result)

      expect(window.location.search).toBe(`?deck=${latest}`)
      expect(window.history.length).toBe(before)
    })

    it("pushes the selected deck into the url", async () => {
      const { result } = renderHook(() => useEditingSession(store()))
      await ready(result)

      act(() => result.current.selectDeck(older))
      await openedWeek(result, older)

      expect(window.location.search).toBe(`?deck=${older}`)
    })

    it("reports a load error for an unknown deck in the url", async () => {
      window.history.replaceState(null, "", "/?deck=missing")
      const { result } = renderHook(() => useEditingSession(store()))

      await until(() => result.current.loadStatus.kind === "error")
    })

    it("opens the previous deck on popstate", async () => {
      const { result } = renderHook(() => useEditingSession(store()))
      await ready(result)

      window.history.replaceState(null, "", `/?deck=${older}`)
      act(() => {
        window.dispatchEvent(new PopStateEvent("popstate"))
      })

      await openedWeek(result, older)
    })
  })

  it("reports saving without an open week", async () => {
    const backend = new InMemoryWorkshopStore()
    const { result } = renderHook(() => useEditingSession(backend))
    await until(() => result.current.loadStatus.kind === "empty")

    await act(() => result.current.save.saveDeck())

    expect(result.current.save.error).toBe("No deck is open")
  })

  it("opens the latest listed week and suggests the following Monday", async () => {
    const backend = store()
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)
    expect(result.current.selectedDeckId).toBe(latest)
    expect(result.current.deck?.period?.start).toBe(latest)
    expect(result.current.suggestedMonday).toBe(next)
  })

  it("keeps a non-date deck id after opening so Save writes back to it", async () => {
    const backend = new InMemoryWorkshopStore(
      new Map([["q4-roadmap", week(latest, "Roadmap")]])
    )
    const saved = vi.spyOn(backend, "saveDeck")
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)

    expect(result.current.selectedDeckId).toBe("q4-roadmap")
    expect(result.current.suggestedMonday).toBe("")
    await act(() => result.current.save.saveDeck())
    expect(saved).toHaveBeenCalledWith("q4-roadmap", expect.anything())
  })

  it("opens the latest week rather than a later non-week deck", async () => {
    const backend = new InMemoryWorkshopStore(
      new Map([
        [older, week(older)],
        [latest, week(latest)],
        ["zz-roadmap", week(older, "Roadmap")],
      ])
    )
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)

    expect(result.current.selectedDeckId).toBe(latest)
    expect(result.current.decks).toContain("zz-roadmap")
    expect(result.current.suggestedMonday).toBe(next)
  })

  it("shows an empty store without an open week", async () => {
    const backend = new InMemoryWorkshopStore()

    const { result } = renderHook(() => useEditingSession(backend))

    await waitFor(() =>
      expect(result.current.loadStatus).toEqual({ kind: "empty" })
    )
    expect(result.current.deck).toBeNull()
  })

  it("shows a list failure as an error without an open week", async () => {
    const backend = new InMemoryWorkshopStore()
    backend.listDecks = async () => {
      throw new Error("List unavailable")
    }

    const { result } = renderHook(() => useEditingSession(backend))

    await waitFor(() =>
      expect(result.current.loadStatus).toEqual({
        kind: "error",
        message: "List unavailable",
      })
    )
    expect(result.current.deck).toBeNull()
  })

  it("keeps exact Metric Input and selection after saving", async () => {
    const backend = store()
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)
    act(() =>
      result.current.layoutControls.evidenceDecision.write(
        { pageId: "p01", metricIndex: 0, field: "baselineValue" },
        "1.50"
      )
    )

    await act(() => result.current.save.saveDeck())

    expect(result.current.save.message).toBe("Saved")
    expect(
      result.current.layoutControls.evidenceDecision.read({
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
    await act(() => result.current.save.saveDeck())
    backend.loadDeck = () => new Promise<Deck>(() => {})

    act(() => result.current.selectDeck(older))

    expect(result.current.loadStatus).toEqual({ kind: "loading" })
    expect(result.current.save.message).toBeNull()
    expect(result.current.deck).toBeNull()
  })

  it("clears the Saved message and Metric Input when another week opens", async () => {
    const backend = store()
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)
    act(() =>
      result.current.layoutControls.evidenceDecision.write(
        { pageId: "p01", metricIndex: 0, field: "baselineValue" },
        "1.50"
      )
    )
    await act(() => result.current.save.saveDeck())

    act(() => result.current.selectDeck(older))
    await ready(result)

    expect(result.current.deck?.period?.start).toBe(older)
    expect(result.current.save.message).toBeNull()
    expect(result.current.operationSnapshot()?.metricInput).toEqual({})
  })

  it("clears invalid save errors when another week opens", async () => {
    const backend = store()
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)
    act(() =>
      result.current.layoutControls.evidenceDecision.write(
        { pageId: "p01", metricIndex: 0, field: "baselineValue" },
        "bad"
      )
    )
    await act(() => result.current.save.saveDeck())

    act(() => result.current.selectDeck(older))

    expect(result.current.save.error).toBeNull()
    await ready(result)
  })

  it("ignores a save finishing after a switch through A → B → A", async () => {
    const pending = deferred<void>()
    const backend = store()
    const originalSave = backend.saveDeck.bind(backend)
    backend.saveDeck = async (monday, document) => {
      await pending.promise
      await originalSave(monday, document)
    }
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)
    let save!: Promise<void>
    act(() => {
      save = result.current.save.saveDeck()
    })
    act(() => result.current.selectDeck(older))
    await openedWeek(result, older)
    act(() => result.current.selectDeck(latest))
    await openedWeek(result, latest)

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
      result.current.layoutControls.evidenceDecision.write(
        { pageId: "p01", metricIndex: 0, field: "baselineValue" },
        "1.50"
      )
    )
    await act(() => result.current.save.saveDeck())
    await act(() => result.current.create.createWeek(next))
    expect(result.current.selectedDeckId).toBe(next)
    expect(result.current.deck?.period?.start).toBe(next)
    expect(result.current.decks).toContain(next)
    expect(result.current.save.message).toBeNull()
    expect(result.current.operationSnapshot()?.metricInput).toEqual({})
    expect(result.current.create.creating).toBe(false)
  })

  it("reports create failure without changing the open week", async () => {
    const backend = store()
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)

    await act(() => result.current.create.createWeek(latest))

    expect(result.current.create.error).toBe(`Deck already exists: ${latest}`)
    expect(result.current.deck?.period?.start).toBe(latest)
    expect(result.current.create.creating).toBe(false)
  })

  it("clears a create failure when another week opens", async () => {
    const backend = store()
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)
    await act(() => result.current.create.createWeek(latest))

    act(() => result.current.selectDeck(older))

    expect(result.current.create.error).toBeNull()
    await openedWeek(result, older)
  })

  it("reports a save failure that finishes after a failed create on the same week", async () => {
    const { result, failSave } = await renderWithPendingFailingSave()

    await act(() => result.current.create.createWeek(latest))
    await failSave()

    expect(result.current.deck?.period?.start).toBe(latest)
    expect(result.current.create.error).toBe(`Deck already exists: ${latest}`)
    expect(result.current.save.error).toBe("Disk full")
    expect(result.current.save.saving).toBe(false)
  })

  it("ignores a save that finishes after a created week opens", async () => {
    const { result, failSave } = await renderWithPendingFailingSave()

    await act(() => result.current.create.createWeek(next))
    await failSave()

    expect(result.current.deck?.period?.start).toBe(next)
    expect(result.current.save.error).toBeNull()
    expect(result.current.save.saving).toBe(false)
  })

  it("logs a save failure that finishes after a created week opens", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { result, failSave } = await renderWithPendingFailingSave()

    await act(() => result.current.create.createWeek(next))
    await failSave()

    expect(warn).toHaveBeenCalledWith(
      `Discarded stale failure: save deck ${latest}`,
      new Error("Disk full")
    )
    warn.mockRestore()
  })

  it("ignores a late create after switching weeks without listing weeks", async () => {
    const pending = deferred<Deck>()
    const backend = store()
    backend.createWeekFromPrevious = () => pending.promise
    const { result } = renderHook(() => useEditingSession(backend))
    await ready(result)
    const listDecks = backend.listDecks.bind(backend)
    let listCalls = 0
    backend.listDecks = () => {
      listCalls++
      return listDecks()
    }
    let create!: Promise<void>
    act(() => {
      create = result.current.create.createWeek(next)
    })
    act(() => result.current.selectDeck(older))
    await openedWeek(result, older)

    await act(async () => {
      pending.resolve(week(next))
      await create
    })
    expect(result.current.selectedDeckId).toBe(older)
    expect(result.current.create.error).toBeNull()
    expect(result.current.create.creating).toBe(false)
    expect(listCalls).toBe(0)
  })
})
