import { describe, expect, it } from "vitest"

import {
  readDeckIdFromUrl,
  readPageNumberFromUrl,
  withDeckId,
  withPageNumber,
} from "@/lib/deck-url"

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

  it("reads a one-based page number from the query string", () => {
    expect(readPageNumberFromUrl("?deck=2026-01-05&page=3")).toBe(3)
  })

  it("treats a missing, zero, or non-integer page as unspecified", () => {
    expect(readPageNumberFromUrl("?deck=2026-01-05")).toBeNull()
    expect(readPageNumberFromUrl("?page=0")).toBeNull()
    expect(readPageNumberFromUrl("?page=-1")).toBeNull()
    expect(readPageNumberFromUrl("?page=1.5")).toBeNull()
    expect(readPageNumberFromUrl("?page=2abc")).toBeNull()
  })

  it("sets the page param after the deck param", () => {
    const url = withPageNumber(new URL("http://x/?deck=2026-01-05"), 2)
    expect(url.search).toBe("?deck=2026-01-05&page=2")
  })

  it("removes the page param when the page is unknown", () => {
    const url = withPageNumber(new URL("http://x/?deck=a&page=4"), null)
    expect(url.search).toBe("?deck=a")
  })
})
