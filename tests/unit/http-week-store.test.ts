import { afterEach, describe, expect, it, vi } from "vitest"

import { createBlankEvidenceDecisionPage } from "@/lib/page-lifecycle"
import type { WeekDocument } from "@/lib/week-document"
import { httpWeekStore } from "@/lib/week-store"

import { jsonResponse } from "./support/json-response"

const monday = "2026-01-12"
const document: WeekDocument = {
  start: monday,
  end: "2026-01-16",
  pages: [createBlankEvidenceDecisionPage("p01")],
}

describe("HTTP Week store", () => {
  afterEach(() => vi.restoreAllMocks())

  it("uses all four week routes and parses list, load, and create responses", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === "/api/weeks") return jsonResponse({ weeks: [monday, 42] })
        if (url === `/weeks/${monday}.json`) return jsonResponse(document)
        if (url === `/api/weeks/${monday}` && init?.method === "PUT")
          return jsonResponse({})
        if (url === `/api/weeks/${monday}` && init?.method === "POST")
          return jsonResponse({ week: document }, 201)
        throw new Error(`Unexpected request: ${url}`)
      })

    expect(await httpWeekStore.listWeeks()).toEqual([monday])
    expect(await httpWeekStore.loadWeek(monday)).toEqual(document)
    await httpWeekStore.saveWeek(monday, document)
    expect(await httpWeekStore.createWeekFromPrevious(monday)).toEqual(document)
    expect(
      fetch.mock.calls.map(([input, init]) => [
        String(input),
        init?.method ?? "GET",
      ])
    ).toEqual([
      ["/api/weeks", "GET"],
      [`/weeks/${monday}.json`, "GET"],
      [`/api/weeks/${monday}`, "PUT"],
      [`/api/weeks/${monday}`, "POST"],
    ])
    expect(fetch.mock.calls[2][1]?.body).toBe(JSON.stringify(document))
  })
})
