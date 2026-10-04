import { describe, expect, it } from "vitest"

import { readDeckIdFromUrl, withDeckId } from "@/lib/deck-url"

describe("deck url", () => {
  it("reads a valid deck id from the query string", () => {
    expect(readDeckIdFromUrl("?deck=2026-01-05")).toBe("2026-01-05")
  })

  it("treats a missing or path-like value as unspecified", () => {
    expect(readDeckIdFromUrl("")).toBeNull()
    expect(readDeckIdFromUrl("?deck=../secret")).toBeNull()
  })

  it("replaces the deck param and keeps other params", () => {
    const url = withDeckId(new URL("http://x/?a=1&deck=old"), "2026-01-05")
    expect(url.search).toBe("?a=1&deck=2026-01-05")
  })
})
