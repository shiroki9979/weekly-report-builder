import { afterEach, describe, expect, it, vi } from "vitest"

import { createBlankEvidenceDecisionPage } from "@/lib/page-lifecycle"
import type { Deck } from "@/lib/deck"
import { httpDeckStore } from "@/lib/deck-store"

import { jsonResponse } from "./support/json-response"

const monday = "2026-01-12"
const document: Deck = {
  period: { start: monday, end: "2026-01-16" },
  pages: [createBlankEvidenceDecisionPage("p01")],
}

describe("HTTP Week store", () => {
  afterEach(() => vi.restoreAllMocks())

  it("uses all four week routes and parses list, load, and create responses", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === "/api/decks") return jsonResponse({ decks: [monday, 42] })
        if (url === `/decks/${monday}.json`) return jsonResponse(document)
        if (url === `/api/decks/${monday}` && init?.method === "PUT")
          return jsonResponse({})
        if (url === `/api/decks/${monday}` && init?.method === "POST")
          return jsonResponse({ deck: document }, 201)
        throw new Error(`Unexpected request: ${url}`)
      })

    expect(await httpDeckStore.listDecks()).toEqual([monday])
    expect(await httpDeckStore.loadDeck(monday)).toEqual(document)
    await httpDeckStore.saveDeck(monday, document)
    expect(await httpDeckStore.createWeekFromPrevious(monday)).toEqual(document)
    expect(
      fetch.mock.calls.map(([input, init]) => [
        String(input),
        init?.method ?? "GET",
      ])
    ).toEqual([
      ["/api/decks", "GET"],
      [`/decks/${monday}.json`, "GET"],
      [`/api/decks/${monday}`, "PUT"],
      [`/api/decks/${monday}`, "POST"],
    ])
    expect(fetch.mock.calls[2][1]?.body).toBe(JSON.stringify(document))
  })
})
