import { describe, expect, it } from "vitest"

import { isDeckId } from "@/lib/deck-id"

describe("isDeckId", () => {
  it("accepts Monday dates and lowercase slugs", () => {
    for (const id of ["2026-08-24", "q4-roadmap", "a", "x".repeat(64)]) {
      expect(isDeckId(id)).toBe(true)
    }
  })

  it("rejects ids that are empty, too long, or not path-safe", () => {
    for (const id of [
      "",
      "x".repeat(65),
      "-lead",
      "Q4",
      "a.b",
      "a/b",
      "..",
      "a b",
    ]) {
      expect(isDeckId(id)).toBe(false)
    }
  })
})
