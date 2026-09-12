import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { spawn, spawnSync } from "node:child_process"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { afterEach, describe, expect, it } from "vitest"

import { seedWeeksFromDemo } from "../../scripts/seed-weeks.ts"

const SEED_SCRIPT = resolve(import.meta.dirname, "../../scripts/seed-weeks.ts")
const PACKAGE_JSON = resolve(import.meta.dirname, "../../package.json")

// 用真實暫存目錄驗證可觀察的檔案系統與行程結果，不斷言內部 copy 步驟
const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    restoreTreePermissions(dir)
    rmSync(dir, { recursive: true, force: true })
  }
})

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

function restoreTreePermissions(root: string): void {
  if (!existsSync(root)) {
    return
  }

  chmodSync(root, 0o755)
  for (const name of readdirSync(root, { withFileTypes: true })) {
    const next = join(root, name.name)
    if (name.isDirectory()) {
      restoreTreePermissions(next)
      continue
    }
    if (name.isFile()) {
      chmodSync(next, 0o644)
    }
  }
}

function writeDemoTree(demoDir: string): void {
  mkdirSync(join(demoDir, "2026-01-05"), { recursive: true })
  writeFileSync(join(demoDir, "2026-01-05.json"), '{"start":"2026-01-05"}\n')
  writeFileSync(join(demoDir, "2026-01-05", "p05.html"), "<svg></svg>\n")
  writeFileSync(join(demoDir, "extra-note.txt"), "keep-me\n")
}

function unexpectedSiblings(parent: string, allowed: string[]): string[] {
  return readdirSync(parent).filter((name) => !allowed.includes(name))
}

function spawnSeedCli(
  repoRoot: string,
  env: NodeJS.ProcessEnv = {}
): ReturnType<typeof spawnSync> {
  mkdirSync(join(repoRoot, "scripts"), { recursive: true })
  copyFileSync(SEED_SCRIPT, join(repoRoot, "scripts", "seed-weeks.ts"))
  return spawnSync(process.execPath, ["scripts/seed-weeks.ts"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...env },
  })
}

describe("seedWeeksFromDemo", () => {
  it("copies the complete demo tree when the target path is absent", () => {
    const root = makeTempDir("seed-weeks-absent-")
    const demoDir = join(root, "demo")
    const weeksDir = join(root, "weeks")
    writeDemoTree(demoDir)

    const result = seedWeeksFromDemo(demoDir, weeksDir)

    expect(result).toEqual({ status: "seeded" })
    expect(readFileSync(join(weeksDir, "2026-01-05.json"), "utf8")).toBe(
      '{"start":"2026-01-05"}\n'
    )
    expect(readFileSync(join(weeksDir, "2026-01-05", "p05.html"), "utf8")).toBe(
      "<svg></svg>\n"
    )
    expect(readFileSync(join(weeksDir, "extra-note.txt"), "utf8")).toBe(
      "keep-me\n"
    )
    expect(unexpectedSiblings(root, ["demo", "weeks"])).toEqual([])
  })

  it("skips an existing directory, including an empty one", () => {
    const root = makeTempDir("seed-weeks-empty-dir-")
    const demoDir = join(root, "demo")
    const weeksDir = join(root, "weeks")
    writeDemoTree(demoDir)
    mkdirSync(weeksDir)

    const result = seedWeeksFromDemo(demoDir, weeksDir)

    expect(result).toEqual({ status: "skipped", reason: "target-exists" })
    expect(readdirSync(weeksDir)).toEqual([])
  })

  it("does not merge into an existing directory that already has files", () => {
    const root = makeTempDir("seed-weeks-existing-dir-")
    const demoDir = join(root, "demo")
    const weeksDir = join(root, "weeks")
    writeDemoTree(demoDir)
    mkdirSync(weeksDir)
    writeFileSync(join(weeksDir, "author-note.txt"), "do-not-touch")

    const result = seedWeeksFromDemo(demoDir, weeksDir)

    expect(result).toEqual({ status: "skipped", reason: "target-exists" })
    expect(readdirSync(weeksDir)).toEqual(["author-note.txt"])
    expect(existsSync(join(weeksDir, "2026-01-05.json"))).toBe(false)
  })

  it("fails when the target is a file and leaves that file unchanged", () => {
    const root = makeTempDir("seed-weeks-file-")
    const demoDir = join(root, "demo")
    const weeksDir = join(root, "weeks")
    writeDemoTree(demoDir)
    writeFileSync(weeksDir, "not-a-directory")

    expect(() => seedWeeksFromDemo(demoDir, weeksDir)).toThrow(
      /exists and is a file/i
    )
    expect(readFileSync(weeksDir, "utf8")).toBe("not-a-directory")
    expect(unexpectedSiblings(root, ["demo", "weeks"])).toEqual([])
  })

  it("fails when the target is a symlink and does not follow it", () => {
    const root = makeTempDir("seed-weeks-symlink-")
    const demoDir = join(root, "demo")
    const weeksDir = join(root, "weeks")
    const realDir = join(root, "real-weeks")
    writeDemoTree(demoDir)
    mkdirSync(realDir)
    writeFileSync(join(realDir, "keep.txt"), "keep")
    symlinkSync(realDir, weeksDir)

    expect(() => seedWeeksFromDemo(demoDir, weeksDir)).toThrow(/symlink/i)
    expect(lstatSync(weeksDir).isSymbolicLink()).toBe(true)
    expect(readdirSync(realDir)).toEqual(["keep.txt"])
    expect(unexpectedSiblings(root, ["demo", "weeks", "real-weeks"])).toEqual(
      []
    )
  })

  it("fails when demo is missing and does not create the target", () => {
    const root = makeTempDir("seed-weeks-missing-demo-")
    const demoDir = join(root, "demo")
    const weeksDir = join(root, "weeks")

    expect(() => seedWeeksFromDemo(demoDir, weeksDir)).toThrow(
      /Demo directory not found/
    )
    expect(existsSync(weeksDir)).toBe(false)
    expect(unexpectedSiblings(root, [])).toEqual([])
  })

  it("fails a copy error without leaving a partial target or temp siblings", () => {
    const root = makeTempDir("seed-weeks-copy-fail-")
    const demoDir = join(root, "demo")
    const weeksDir = join(root, "weeks")
    writeDemoTree(demoDir)
    const lockedDir = join(demoDir, "locked")
    mkdirSync(lockedDir)
    writeFileSync(join(lockedDir, "secret.txt"), "secret")
    chmodSync(lockedDir, 0)

    expect(() => seedWeeksFromDemo(demoDir, weeksDir)).toThrow(
      /Failed to seed weeks/
    )
    expect(existsSync(weeksDir)).toBe(false)
    expect(unexpectedSiblings(root, ["demo"])).toEqual([])
  })

  it("keeps the winner and skips the loser when two seeds race", async () => {
    const root = makeTempDir("seed-weeks-race-")
    const demoDir = join(root, "demo")
    const weeksDir = join(root, "weeks")
    writeDemoTree(demoDir)

    const runner = `
      import { seedWeeksFromDemo } from ${JSON.stringify(pathToFileURL(SEED_SCRIPT).href)};
      const result = seedWeeksFromDemo(
        ${JSON.stringify(demoDir)},
        ${JSON.stringify(weeksDir)}
      );
      process.stdout.write(JSON.stringify(result));
    `

    const spawnOne = () =>
      new Promise<{
        status: number | null
        stdout: string
        stderr: string
      }>((resolvePromise, rejectPromise) => {
        const child = spawn(
          process.execPath,
          ["--input-type=module", "-e", runner],
          { env: process.env }
        )
        let stdout = ""
        let stderr = ""
        child.stdout.on("data", (chunk: Buffer | string) => {
          stdout += String(chunk)
        })
        child.stderr.on("data", (chunk: Buffer | string) => {
          stderr += String(chunk)
        })
        child.on("error", rejectPromise)
        child.on("close", (status) => {
          resolvePromise({ status, stdout, stderr })
        })
      })

    const [first, second] = await Promise.all([spawnOne(), spawnOne()])

    expect(first.status).toBe(0)
    expect(second.status).toBe(0)
    const statuses = [JSON.parse(first.stdout), JSON.parse(second.stdout)]
      .map((result: { status: string }) => result.status)
      .sort()
    expect(statuses).toEqual(["seeded", "skipped"])
    expect(readFileSync(join(weeksDir, "extra-note.txt"), "utf8")).toBe(
      "keep-me\n"
    )
    expect(unexpectedSiblings(root, ["demo", "weeks"])).toEqual([])
  })
})

describe("seed:weeks CLI", () => {
  it("uses the same command for postinstall and seed:weeks", () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, "utf8")) as {
      scripts: Record<string, string>
    }

    expect(pkg.scripts.postinstall).toBe(pkg.scripts["seed:weeks"])
    expect(pkg.scripts["seed:weeks"]).toContain("scripts/seed-weeks.ts")
  })

  it("copies demo to weeks, ignores WEEKS_DIR, and exits 0", () => {
    const repoRoot = makeTempDir("seed-cli-success-")
    const overrideDir = join(makeTempDir("seed-cli-weeks-dir-"), "override")
    mkdirSync(overrideDir)
    writeDemoTree(join(repoRoot, "demo"))

    const spawned = spawnSeedCli(repoRoot, { WEEKS_DIR: overrideDir })

    expect(spawned.status).toBe(0)
    expect(spawned.stdout).toMatch(/copied demo/i)
    expect(existsSync(join(repoRoot, "weeks", "2026-01-05.json"))).toBe(true)
    expect(readdirSync(overrideDir)).toEqual([])
  })

  it("skips an existing weeks directory with exit 0", () => {
    const repoRoot = makeTempDir("seed-cli-skip-")
    writeDemoTree(join(repoRoot, "demo"))
    mkdirSync(join(repoRoot, "weeks"))
    writeFileSync(join(repoRoot, "weeks", "author.txt"), "keep")

    const spawned = spawnSeedCli(repoRoot)

    expect(spawned.status).toBe(0)
    expect(spawned.stdout).toMatch(/skipped/i)
    expect(readdirSync(join(repoRoot, "weeks"))).toEqual(["author.txt"])
  })

  it("fails a file target with a contextual error and non-zero exit", () => {
    const repoRoot = makeTempDir("seed-cli-fail-")
    writeDemoTree(join(repoRoot, "demo"))
    writeFileSync(join(repoRoot, "weeks"), "blocked")

    const spawned = spawnSeedCli(repoRoot)

    expect(spawned.status).not.toBe(0)
    expect(spawned.stderr).toMatch(/seed:weeks failed/i)
    expect(spawned.stderr).toMatch(/file/i)
    expect(readFileSync(join(repoRoot, "weeks"), "utf8")).toBe("blocked")
  })
})
