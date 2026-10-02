import path from "node:path"
import { describe, expect, it } from "vitest"

import { isPathInside } from "../../server/path-containment"

describe("isPathInside", () => {
  const decksDir = path.resolve("/srv/app/decks")

  it("accepts a file inside the directory", () => {
    expect(isPathInside(decksDir, path.join(decksDir, "q4.json"))).toBe(true)
  })

  it("rejects a sibling directory that shares the name prefix", () => {
    expect(isPathInside(decksDir, path.resolve("/srv/app/decks-evil/x"))).toBe(
      false
    )
  })

  it("rejects the directory itself and paths that climb out", () => {
    expect(isPathInside(decksDir, decksDir)).toBe(false)
    expect(isPathInside(decksDir, path.resolve(decksDir, "../secret"))).toBe(
      false
    )
  })
})
