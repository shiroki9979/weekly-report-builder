import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { copyWeeksForProductionBuild } from "../../server/copy-weeks-static.ts"

// 用真實暫存目錄驗證 build copy 的可觀察結果，不斷言 Vite plugin 內部
const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

describe("copyWeeksForProductionBuild", () => {
  it("fails with a seed instruction when the runtime store is missing", () => {
    const root = makeTempDir("wrb-copy-weeks-missing-")
    const weeksDir = join(root, "weeks")
    const outputDir = join(root, "dist", "weeks")

    expect(() => copyWeeksForProductionBuild(weeksDir, outputDir)).toThrow(
      /pnpm seed:weeks/
    )
    expect(existsSync(weeksDir)).toBe(false)
    expect(existsSync(outputDir)).toBe(false)
  })

  it("copies json week documents and html assets without modifying the store", () => {
    const root = makeTempDir("wrb-copy-weeks-copy-")
    const weeksDir = join(root, "weeks")
    const outputDir = join(root, "dist", "weeks")
    mkdirSync(join(weeksDir, "2026-08-24"), { recursive: true })
    writeFileSync(join(weeksDir, "2026-08-24.json"), '{"start":"2026-08-24"}\n')
    writeFileSync(join(weeksDir, "2026-08-24", "p02.html"), "<svg></svg>\n")
    writeFileSync(join(weeksDir, "notes.txt"), "leave-me\n")
    mkdirSync(join(weeksDir, "not-a-monday"))
    writeFileSync(join(weeksDir, "not-a-monday", "x.html"), "<p>skip</p>\n")

    copyWeeksForProductionBuild(weeksDir, outputDir)

    expect(readFileSync(join(outputDir, "2026-08-24.json"), "utf8")).toBe(
      '{"start":"2026-08-24"}\n'
    )
    expect(
      readFileSync(join(outputDir, "2026-08-24", "p02.html"), "utf8")
    ).toBe("<svg></svg>\n")
    expect(existsSync(join(outputDir, "notes.txt"))).toBe(false)
    expect(existsSync(join(outputDir, "not-a-monday"))).toBe(false)
    expect(readFileSync(join(weeksDir, "notes.txt"), "utf8")).toBe("leave-me\n")
  })
})
