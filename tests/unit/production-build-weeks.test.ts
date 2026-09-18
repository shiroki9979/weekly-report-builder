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

describe("production build weeks copy", () => {
  it("fails with a seed instruction when the runtime store is missing", () => {
    const root = makeTempDir("wrb-build-weeks-missing-")
    const weeksDir = join(root, "weeks")
    const outDir = join(root, "dist")

    const result = spawnSync(
      process.execPath,
      [viteCli, "build", "--outDir", outDir],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: { ...process.env, WEEKS_DIR: weeksDir },
      }
    )

    const output = `${result.stdout}${result.stderr}`
    expect(result.status).not.toBe(0)
    expect(output).toMatch(/pnpm seed:weeks/)
    expect(existsSync(weeksDir)).toBe(false)
  }, 60_000)
})
