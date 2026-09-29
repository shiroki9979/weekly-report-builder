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

import { migrateLegacyStore, seedDecksFromDemo } from "../../scripts/seed-decks"

const SEED_SCRIPT = resolve(import.meta.dirname, "../../scripts/seed-decks.ts")
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
  copyFileSync(SEED_SCRIPT, join(repoRoot, "scripts", "seed-decks.ts"))
  return spawnSync(process.execPath, ["scripts/seed-decks.ts"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...env },
  })
}

describe("seedDecksFromDemo", () => {
  it("copies the complete demo tree when the target path is absent", () => {
    const root = makeTempDir("seed-decks-absent-")
    const demoDir = join(root, "demo")
    const decksDir = join(root, "decks")
    writeDemoTree(demoDir)

    const result = seedDecksFromDemo(demoDir, decksDir)

    expect(result).toEqual({ status: "seeded" })
    expect(readFileSync(join(decksDir, "2026-01-05.json"), "utf8")).toBe(
      '{"start":"2026-01-05"}\n'
    )
    expect(readFileSync(join(decksDir, "2026-01-05", "p05.html"), "utf8")).toBe(
      "<svg></svg>\n"
    )
    expect(readFileSync(join(decksDir, "extra-note.txt"), "utf8")).toBe(
      "keep-me\n"
    )
    expect(unexpectedSiblings(root, ["demo", "decks"])).toEqual([])
  })

  it("skips an existing directory, including an empty one", () => {
    const root = makeTempDir("seed-decks-empty-dir-")
    const demoDir = join(root, "demo")
    const decksDir = join(root, "decks")
    writeDemoTree(demoDir)
    mkdirSync(decksDir)

    const result = seedDecksFromDemo(demoDir, decksDir)

    expect(result).toEqual({ status: "skipped", reason: "target-exists" })
    expect(readdirSync(decksDir)).toEqual([])
  })

  it("does not merge into an existing directory that already has files", () => {
    const root = makeTempDir("seed-decks-existing-dir-")
    const demoDir = join(root, "demo")
    const decksDir = join(root, "decks")
    writeDemoTree(demoDir)
    mkdirSync(decksDir)
    writeFileSync(join(decksDir, "author-note.txt"), "do-not-touch")

    const result = seedDecksFromDemo(demoDir, decksDir)

    expect(result).toEqual({ status: "skipped", reason: "target-exists" })
    expect(readdirSync(decksDir)).toEqual(["author-note.txt"])
    expect(existsSync(join(decksDir, "2026-01-05.json"))).toBe(false)
  })

  it("fails when the target is a file and leaves that file unchanged", () => {
    const root = makeTempDir("seed-decks-file-")
    const demoDir = join(root, "demo")
    const decksDir = join(root, "decks")
    writeDemoTree(demoDir)
    writeFileSync(decksDir, "not-a-directory")

    expect(() => seedDecksFromDemo(demoDir, decksDir)).toThrow(
      /exists and is a file/i
    )
    expect(readFileSync(decksDir, "utf8")).toBe("not-a-directory")
    expect(unexpectedSiblings(root, ["demo", "decks"])).toEqual([])
  })

  it("fails when the target is a symlink and does not follow it", () => {
    const root = makeTempDir("seed-decks-symlink-")
    const demoDir = join(root, "demo")
    const decksDir = join(root, "decks")
    const realDir = join(root, "real-decks")
    writeDemoTree(demoDir)
    mkdirSync(realDir)
    writeFileSync(join(realDir, "keep.txt"), "keep")
    symlinkSync(realDir, decksDir)

    expect(() => seedDecksFromDemo(demoDir, decksDir)).toThrow(/symlink/i)
    expect(lstatSync(decksDir).isSymbolicLink()).toBe(true)
    expect(readdirSync(realDir)).toEqual(["keep.txt"])
    expect(unexpectedSiblings(root, ["demo", "decks", "real-decks"])).toEqual(
      []
    )
  })

  it("fails when demo is missing and does not create the target", () => {
    const root = makeTempDir("seed-decks-missing-demo-")
    const demoDir = join(root, "demo")
    const decksDir = join(root, "decks")

    expect(() => seedDecksFromDemo(demoDir, decksDir)).toThrow(
      /Demo directory not found/
    )
    expect(existsSync(decksDir)).toBe(false)
    expect(unexpectedSiblings(root, [])).toEqual([])
  })

  it("fails a copy error without leaving a partial target or temp siblings", () => {
    const root = makeTempDir("seed-decks-copy-fail-")
    const demoDir = join(root, "demo")
    const decksDir = join(root, "decks")
    writeDemoTree(demoDir)
    const lockedDir = join(demoDir, "locked")
    mkdirSync(lockedDir)
    writeFileSync(join(lockedDir, "secret.txt"), "secret")
    chmodSync(lockedDir, 0)

    expect(() => seedDecksFromDemo(demoDir, decksDir)).toThrow(
      /Failed to seed decks/
    )
    expect(existsSync(decksDir)).toBe(false)
    expect(unexpectedSiblings(root, ["demo"])).toEqual([])
  })

  it("keeps the winner and skips the loser when two seeds race", async () => {
    const root = makeTempDir("seed-decks-race-")
    const demoDir = join(root, "demo")
    const decksDir = join(root, "decks")
    writeDemoTree(demoDir)

    const runner = `
      import { seedDecksFromDemo } from ${JSON.stringify(pathToFileURL(SEED_SCRIPT).href)};
      const result = seedDecksFromDemo(
        ${JSON.stringify(demoDir)},
        ${JSON.stringify(decksDir)}
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
    expect(readFileSync(join(decksDir, "extra-note.txt"), "utf8")).toBe(
      "keep-me\n"
    )
    expect(unexpectedSiblings(root, ["demo", "decks"])).toEqual([])
  })
})

describe("seed:decks CLI", () => {
  it("uses the same command for postinstall and seed:decks", () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, "utf8")) as {
      scripts: Record<string, string>
    }

    expect(pkg.scripts.postinstall).toBe(pkg.scripts["seed:decks"])
    expect(pkg.scripts["seed:decks"]).toContain("scripts/seed-decks.ts")
  })

  it("copies demo to decks, ignores DECKS_DIR, and exits 0", () => {
    const repoRoot = makeTempDir("seed-cli-success-")
    const overrideDir = join(makeTempDir("seed-cli-decks-dir-"), "override")
    mkdirSync(overrideDir)
    writeDemoTree(join(repoRoot, "demo"))

    const spawned = spawnSeedCli(repoRoot, { DECKS_DIR: overrideDir })

    expect(spawned.status).toBe(0)
    expect(spawned.stdout).toMatch(/copied demo/i)
    expect(existsSync(join(repoRoot, "decks", "2026-01-05.json"))).toBe(true)
    expect(readdirSync(overrideDir)).toEqual([])
  })

  it("skips an existing decks directory with exit 0", () => {
    const repoRoot = makeTempDir("seed-cli-skip-")
    writeDemoTree(join(repoRoot, "demo"))
    mkdirSync(join(repoRoot, "decks"))
    writeFileSync(join(repoRoot, "decks", "author.txt"), "keep")

    const spawned = spawnSeedCli(repoRoot)

    expect(spawned.status).toBe(0)
    expect(spawned.stdout).toMatch(/skipped/i)
    expect(readdirSync(join(repoRoot, "decks"))).toEqual(["author.txt"])
  })

  it("fails a file target with a contextual error and non-zero exit", () => {
    const repoRoot = makeTempDir("seed-cli-fail-")
    writeDemoTree(join(repoRoot, "demo"))
    writeFileSync(join(repoRoot, "decks"), "blocked")

    const spawned = spawnSeedCli(repoRoot)

    expect(spawned.status).not.toBe(0)
    expect(spawned.stderr).toMatch(/seed:decks failed/i)
    expect(spawned.stderr).toMatch(/file/i)
    expect(readFileSync(join(repoRoot, "decks"), "utf8")).toBe("blocked")
  })

  it("moves a legacy weeks directory to decks without seeding over it", () => {
    const repoRoot = makeTempDir("seed-cli-migrate-")
    writeDemoTree(join(repoRoot, "demo"))
    mkdirSync(join(repoRoot, "weeks", "2026-08-24"), { recursive: true })
    writeFileSync(join(repoRoot, "weeks", "2026-08-24.json"), "mine")
    writeFileSync(join(repoRoot, "weeks", "2026-08-24", "p01.html"), "<p/>")

    const spawned = spawnSeedCli(repoRoot)

    expect(spawned.status).toBe(0)
    expect(spawned.stdout).toMatch(/moved weeks\//)
    expect(existsSync(join(repoRoot, "weeks"))).toBe(false)
    expect(
      readFileSync(join(repoRoot, "decks", "2026-08-24.json"), "utf8")
    ).toBe("mine")
    expect(existsSync(join(repoRoot, "decks", "2026-08-24", "p01.html"))).toBe(
      true
    )
    expect(existsSync(join(repoRoot, "decks", "2026-01-05.json"))).toBe(false)
  })
})

describe("migrateLegacyStore", () => {
  it("reports absent when there is no legacy store", () => {
    const root = makeTempDir("migrate-absent-")

    expect(
      migrateLegacyStore(join(root, "weeks"), join(root, "decks"))
    ).toEqual({ status: "absent" })
    expect(existsSync(join(root, "decks"))).toBe(false)
  })

  it("refuses to merge when both stores exist and leaves both untouched", () => {
    const root = makeTempDir("migrate-both-")
    mkdirSync(join(root, "weeks"))
    writeFileSync(join(root, "weeks", "old.json"), "old")
    mkdirSync(join(root, "decks"))
    writeFileSync(join(root, "decks", "new.json"), "new")

    expect(() =>
      migrateLegacyStore(join(root, "weeks"), join(root, "decks"))
    ).toThrow(/Both .* exist/)
    expect(readdirSync(join(root, "weeks"))).toEqual(["old.json"])
    expect(readdirSync(join(root, "decks"))).toEqual(["new.json"])
  })

  it("refuses a legacy path that is not a directory", () => {
    const root = makeTempDir("migrate-file-")
    writeFileSync(join(root, "weeks"), "blocked")

    expect(() =>
      migrateLegacyStore(join(root, "weeks"), join(root, "decks"))
    ).toThrow(/not a directory/)
    expect(existsSync(join(root, "decks"))).toBe(false)
  })
})
