import { describe, expect, it } from "vitest"

import { moveEntry } from "@/lib/move-entry"

describe("moveEntry", () => {
  it("moves an entry to the requested position without mutating the input", () => {
    const entries = ["a", "b", "c"]

    const moved = moveEntry(entries, { from: 0, to: 2 })

    expect(moved).toEqual(["b", "c", "a"])
    expect(entries).toEqual(["a", "b", "c"])
  })

  it("rejects a move outside the list with the offending positions", () => {
    expect(() => moveEntry(["a", "b"], { from: 1, to: 2 })).toThrow(
      "Cannot move entry 1 to 2 in a list of 2"
    )
  })
})
