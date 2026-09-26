import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useWeekCreate } from "@/hooks/use-week-create"
import type { WeekDocument } from "@/lib/week-document"

import { jsonResponse } from "./support/json-response"

const PREVIOUS_MONDAY = "2026-01-05"
const NEW_MONDAY = "2026-01-12"

const createdWeek: WeekDocument = {
  start: NEW_MONDAY,
  end: "2026-01-16",
  pages: [
    {
      id: "p01",
      layout: "html",
      title: "",
      htmlFile: "p01.html",
    },
  ],
}

type CreateOutcome = "created" | "conflict"

function mockCreateFetch(outcome: CreateOutcome) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input)
    if (url === `/api/weeks/${NEW_MONDAY}` && init?.method === "POST") {
      return outcome === "created"
        ? jsonResponse({ week: createdWeek }, 201)
        : jsonResponse({ error: "Week already exists" }, 409)
    }
    if (url === "/api/weeks") {
      return jsonResponse({ weeks: [PREVIOUS_MONDAY, NEW_MONDAY] })
    }
    throw new Error(`Unexpected fetch: ${url}`)
  })
}

describe("useWeekCreate", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("opens the created week with the refreshed week list", async () => {
    mockCreateFetch("created")
    const onCreated = vi.fn()
    const { result } = renderHook(() => useWeekCreate({ onCreated }))

    await act(() => result.current.createWeek(NEW_MONDAY))

    expect(onCreated).toHaveBeenCalledWith(
      [PREVIOUS_MONDAY, NEW_MONDAY],
      NEW_MONDAY
    )
    expect(result.current.error).toBeNull()
    expect(result.current.creating).toBe(false)
  })

  it("reports a failed creation without opening a week", async () => {
    mockCreateFetch("conflict")
    const onCreated = vi.fn()
    const { result } = renderHook(() => useWeekCreate({ onCreated }))

    await act(() => result.current.createWeek(NEW_MONDAY))

    expect(onCreated).not.toHaveBeenCalled()
    expect(result.current.error).toBe(
      "Failed to create week file: 2026-01-12.json (409)"
    )
    expect(result.current.creating).toBe(false)
  })

  it("runs onStart before the request so stale status clears even when creation fails", async () => {
    mockCreateFetch("conflict")
    const events: string[] = []
    const onStart = vi.fn(() => {
      events.push("start")
    })
    vi.mocked(globalThis.fetch).mockImplementationOnce(async () => {
      events.push("request")
      return jsonResponse({ error: "Week already exists" }, 409)
    })
    const { result } = renderHook(() =>
      useWeekCreate({ onStart, onCreated: vi.fn() })
    )

    await act(() => result.current.createWeek(NEW_MONDAY))

    expect(events).toEqual(["start", "request"])
  })
})
