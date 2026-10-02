import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

const repoRoot = resolve(import.meta.dirname, "../..")
const viteCli = resolve(repoRoot, "node_modules/vite/bin/vite.js")

// 從 production build 行程驗證缺 store 錯誤，不斷言內部 copy 步驟
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

describe("production build decks copy", () => {
  it("fails with a seed instruction when the runtime store is missing", () => {
    const root = makeTempDir("wrb-build-decks-missing-")
    const decksDir = join(root, "decks")
    const outDir = join(root, "dist")

    const result = spawnSync(
      process.execPath,
      [viteCli, "build", "--outDir", outDir],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: { ...process.env, DECKS_DIR: decksDir },
      }
    )

    const output = `${result.stdout}${result.stderr}`
    expect(result.status).not.toBe(0)
    expect(output).toMatch(/pnpm seed:decks/)
    expect(existsSync(decksDir)).toBe(false)
  }, 60_000)
})
