import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useWeekCreate } from "@/hooks/use-week-create"
import type { WeekDocument } from "@/lib/week-document"

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

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

function mockCreateFetch(createStatus: number) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input)
    if (url === `/api/weeks/${NEW_MONDAY}` && init?.method === "POST") {
      return createStatus === 201
        ? jsonResponse({ week: createdWeek }, 201)
        : jsonResponse({ error: "Week already exists" }, createStatus)
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
    mockCreateFetch(201)
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
    mockCreateFetch(409)
    const onCreated = vi.fn()
    const { result } = renderHook(() => useWeekCreate({ onCreated }))

    await act(() => result.current.createWeek(NEW_MONDAY))

    expect(onCreated).not.toHaveBeenCalled()
    expect(result.current.error).toBe(
      "Failed to create week file: 2026-01-12.json (409)"
    )
    expect(result.current.creating).toBe(false)
  })
})
