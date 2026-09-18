import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useWeekEditor } from "@/hooks/use-week-editor"
import type { WeekDocument } from "@/lib/week-document"

const OLDER_MONDAY = "2025-12-29"
const LATEST_MONDAY = "2026-01-12"
const HARD_CODED_MONDAY = "2026-08-24"

function weekDocument(monday: string, title: string): WeekDocument {
  return {
    start: monday,
    end: monday,
    pages: [
      {
        id: "p01",
        layout: "two-column",
        title,
        items: [
          { heading: "One", body: "A" },
          { heading: "Two", body: "B" },
          { heading: "Three", body: "C" },
        ],
        panel: {
          kind: "table",
          title: "Metrics",
          columns: ["Item"],
          rows: [{ cells: ["1"] }],
        },
      },
    ],
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

function fetchUrl(input: RequestInfo | URL): string {
  return String(input)
}

function mockWeeksFetch({
  weeks = [],
  documents = {},
  listStatus,
  listNetworkError,
}: {
  weeks?: string[]
  documents?: Record<string, WeekDocument>
  listStatus?: number
  listNetworkError?: Error
} = {}) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = fetchUrl(input)

    if (url === "/api/weeks") {
      if (listNetworkError) {
        throw listNetworkError
      }
      if (listStatus !== undefined && listStatus >= 400) {
        return jsonResponse({ error: "list failed" }, listStatus)
      }
      return jsonResponse({ weeks })
    }

    const documentMatch = /^\/weeks\/(\d{4}-\d{2}-\d{2})\.json$/.exec(url)
    if (documentMatch) {
      const monday = documentMatch[1]
      const document = documents[monday]
      if (!document) {
        return jsonResponse({ error: "missing" }, 404)
      }
      return jsonResponse(document)
    }

    throw new Error(`Unexpected fetch: ${url}`)
  })
}

function fetchedUrls(): string[] {
  return vi
    .mocked(globalThis.fetch)
    .mock.calls.map(([input]) => fetchUrl(input))
}

describe("useWeekEditor", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("lists available weeks before loading a document and opens the latest Monday", async () => {
    const latest = weekDocument(LATEST_MONDAY, "Latest week")
    const older = weekDocument(OLDER_MONDAY, "Older week")
    mockWeeksFetch({
      weeks: [OLDER_MONDAY, LATEST_MONDAY],
      documents: {
        [OLDER_MONDAY]: older,
        [LATEST_MONDAY]: latest,
      },
    })

    const { result } = renderHook(() => useWeekEditor())

    await waitFor(() => {
      expect(result.current.loadStatus).toEqual({ kind: "ready" })
    })

    expect(fetchedUrls()[0]).toBe("/api/weeks")
    expect(fetchedUrls()).toContain(`/weeks/${LATEST_MONDAY}.json`)
    expect(fetchedUrls()).not.toContain(`/weeks/${HARD_CODED_MONDAY}.json`)
    expect(result.current.selectedMonday).toBe(LATEST_MONDAY)
    expect(result.current.week?.pages[0]?.title).toBe("Latest week")
    expect(result.current.selectedPageId).toBe("p01")
    expect(result.current.suggestedMonday).toBe("2026-01-19")
    expect(result.current).not.toHaveProperty("loading")
  })

  it("treats a successful empty list as an empty store instead of a missing file", async () => {
    mockWeeksFetch({ weeks: [] })

    const { result } = renderHook(() => useWeekEditor())

    await waitFor(() => {
      expect(result.current.loadStatus).toEqual({ kind: "empty" })
    })

    expect(result.current.week).toBeNull()
    expect(result.current.weeks).toEqual([])
    expect(fetchedUrls()).toEqual(["/api/weeks"])
    expect(fetchedUrls().some((url) => url.startsWith("/weeks/"))).toBe(false)
  })

  it("keeps API list failures as an error and does not use the empty store", async () => {
    mockWeeksFetch({ listStatus: 503 })

    const { result } = renderHook(() => useWeekEditor())

    await waitFor(() => {
      expect(result.current.loadStatus).toEqual({
        kind: "error",
        message: "Failed to list week files (503)",
      })
    })

    expect(result.current.week).toBeNull()
    expect(fetchedUrls().some((url) => url.startsWith("/weeks/"))).toBe(false)
  })

  it("keeps network list failures as an error and does not use the empty store", async () => {
    mockWeeksFetch({ listNetworkError: new Error("Failed to fetch") })

    const { result } = renderHook(() => useWeekEditor())

    await waitFor(() => {
      expect(result.current.loadStatus).toEqual({
        kind: "error",
        message: "Failed to fetch",
      })
    })

    expect(result.current.week).toBeNull()
    expect(fetchedUrls().some((url) => url.startsWith("/weeks/"))).toBe(false)
  })

  it("loads a later user-selected week without returning to a hard-coded date", async () => {
    const latest = weekDocument(LATEST_MONDAY, "Latest week")
    const older = weekDocument(OLDER_MONDAY, "Older week")
    mockWeeksFetch({
      weeks: [OLDER_MONDAY, LATEST_MONDAY],
      documents: {
        [OLDER_MONDAY]: older,
        [LATEST_MONDAY]: latest,
      },
    })

    const { result } = renderHook(() => useWeekEditor())

    await waitFor(() => {
      expect(result.current.loadStatus).toEqual({ kind: "ready" })
    })

    act(() => {
      result.current.setSelectedMonday(OLDER_MONDAY)
    })

    await waitFor(() => {
      expect(result.current.selectedMonday).toBe(OLDER_MONDAY)
      expect(result.current.week?.pages[0]?.title).toBe("Older week")
      expect(result.current.loadStatus).toEqual({ kind: "ready" })
    })

    expect(fetchedUrls()).toContain(`/weeks/${OLDER_MONDAY}.json`)
    expect(fetchedUrls()).not.toContain(`/weeks/${HARD_CODED_MONDAY}.json`)
    expect(result.current.selectedPageId).toBe("p01")
  })

  it("keeps the ready week when the same Monday is selected again", async () => {
    const latest = weekDocument(LATEST_MONDAY, "Latest week")
    mockWeeksFetch({
      weeks: [LATEST_MONDAY],
      documents: { [LATEST_MONDAY]: latest },
    })

    const { result } = renderHook(() => useWeekEditor())

    await waitFor(() => {
      expect(result.current.loadStatus).toEqual({ kind: "ready" })
    })

    act(() => {
      result.current.setSelectedMonday(LATEST_MONDAY)
    })

    expect(result.current.loadStatus).toEqual({ kind: "ready" })
    expect(result.current.week?.pages[0]?.title).toBe("Latest week")
  })

  it("ignores a stale save refresh after selecting another week", async () => {
    const latest = weekDocument(LATEST_MONDAY, "Latest week")
    const older = weekDocument(OLDER_MONDAY, "Older week")
    let latestDocumentRequests = 0
    let resolveStaleRefresh: ((response: Response) => void) | null = null

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = fetchUrl(input)

      if (url === "/api/weeks") {
        return jsonResponse({ weeks: [OLDER_MONDAY, LATEST_MONDAY] })
      }

      if (url === `/api/weeks/${LATEST_MONDAY}` && init?.method === "PUT") {
        return jsonResponse({})
      }

      if (url === `/weeks/${LATEST_MONDAY}.json`) {
        latestDocumentRequests += 1
        if (latestDocumentRequests === 1) {
          return jsonResponse(latest)
        }

        return new Promise<Response>((resolve) => {
          resolveStaleRefresh = resolve
        })
      }

      if (url === `/weeks/${OLDER_MONDAY}.json`) {
        return jsonResponse(older)
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })

    const { result } = renderHook(() => useWeekEditor())

    await waitFor(() => {
      expect(result.current.week?.pages[0]?.title).toBe("Latest week")
    })

    act(() => {
      void result.current.saveWeek()
    })

    await waitFor(() => {
      expect(resolveStaleRefresh).not.toBeNull()
    })

    act(() => {
      result.current.setSelectedMonday(OLDER_MONDAY)
    })

    await waitFor(() => {
      expect(result.current.selectedMonday).toBe(OLDER_MONDAY)
      expect(result.current.week?.pages[0]?.title).toBe("Older week")
    })

    act(() => {
      resolveStaleRefresh?.(jsonResponse(latest))
    })

    await waitFor(() => {
      expect(result.current.saving).toBe(false)
    })

    expect(result.current.loadStatus).toEqual({ kind: "ready" })
    expect(result.current.week?.pages[0]?.title).toBe("Older week")
    expect(result.current.saveMessage).toBeNull()
  })
})
