import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export type SeedDecksResult =
  { status: "seeded" } | { status: "skipped"; reason: "target-exists" }

export type MigrateLegacyResult = { status: "migrated" } | { status: "absent" }

function isErrnoCode(error: unknown, codes: readonly string[]): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false
  }

  return codes.includes((error as { code: unknown }).code as string)
}

function inspectDecksTarget(
  decksDir: string
): "absent" | "directory" | "file" | "symlink" {
  try {
    const stat = fs.lstatSync(decksDir)
    if (stat.isSymbolicLink()) {
      return "symlink"
    }
    if (stat.isDirectory()) {
      return "directory"
    }
    return "file"
  } catch (error) {
    if (isErrnoCode(error, ["ENOENT"])) {
      return "absent"
    }
    throw error
  }
}

function isDemoDirectory(demoDir: string): boolean {
  try {
    return fs.statSync(demoDir).isDirectory()
  } catch (error) {
    if (isErrnoCode(error, ["ENOENT"])) {
      return false
    }
    throw error
  }
}

function copyDirectoryContents(sourceDir: string, targetDir: string): void {
  // 用可捕捉的 JS fs 錯誤複製，避免 native cp 在權限失敗時直接終止行程
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const from = path.join(sourceDir, entry.name)
    const to = path.join(targetDir, entry.name)
    if (entry.isDirectory()) {
      fs.mkdirSync(to)
      copyDirectoryContents(from, to)
      continue
    }
    if (entry.isSymbolicLink()) {
      fs.symlinkSync(fs.readlinkSync(from), to)
      continue
    }
    fs.copyFileSync(from, to)
  }
}

export function seedDecksFromDemo(
  demoDir: string,
  decksDir: string
): SeedDecksResult {
  const target = inspectDecksTarget(decksDir)
  if (target === "directory") {
    return { status: "skipped", reason: "target-exists" }
  }
  if (target === "file") {
    throw new Error(`Cannot seed decks: ${decksDir} exists and is a file`)
  }
  if (target === "symlink") {
    throw new Error(`Cannot seed decks: ${decksDir} exists and is a symlink`)
  }

  if (!isDemoDirectory(demoDir)) {
    throw new Error(`Demo directory not found: ${demoDir}`)
  }

  const parentDir = path.dirname(decksDir)
  fs.mkdirSync(parentDir, { recursive: true })

  // 先寫入同層暫存再 rename，中斷時不會留下半套 decks/ 擋住重試
  const tempDir = fs.mkdtempSync(
    path.join(parentDir, `.${path.basename(decksDir)}-seed-`)
  )

  try {
    copyDirectoryContents(demoDir, tempDir)
    fs.renameSync(tempDir, decksDir)
    return { status: "seeded" }
  } catch (error) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    // 並行時 loser 的 rename 會撞上 winner 已建立的目錄；此時當 skipped，不得覆寫
    if (
      isErrnoCode(error, ["EEXIST", "ENOTEMPTY", "EPERM"]) &&
      inspectDecksTarget(decksDir) === "directory"
    ) {
      return { status: "skipped", reason: "target-exists" }
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to seed decks at ${decksDir}: ${message}`, {
      cause: error,
    })
  }
}

/**
 * 改名前的 store 在 weeks/。decks/ 尚不存在時整個搬過去，內容不動；
 * 兩者都存在時不猜哪一份是作者要的，拒絕合併並請作者自行處理。
 */
export function migrateLegacyStore(
  legacyDir: string,
  decksDir: string
): MigrateLegacyResult {
  const legacy = inspectDecksTarget(legacyDir)
  if (legacy === "absent") {
    return { status: "absent" }
  }
  if (legacy !== "directory") {
    throw new Error(
      `Cannot migrate ${legacyDir}: it exists and is a ${legacy}, not a directory`
    )
  }
  if (inspectDecksTarget(decksDir) !== "absent") {
    throw new Error(
      `Both ${legacyDir} and ${decksDir} exist. Move any decks you want to keep into ${decksDir}, then remove ${legacyDir}.`
    )
  }

  fs.renameSync(legacyDir, decksDir)
  return { status: "migrated" }
}

function resolveRepoRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
}

function runCli(): void {
  // 固定 repo root，避免 postinstall 把測試用的 DECKS_DIR 當寫入目標
  const repoRoot = resolveRepoRoot()
  const demoDir = path.join(repoRoot, "demo")
  const decksDir = path.join(repoRoot, "decks")

  try {
    // 先遷移舊 store，否則 seed 會在 decks/ 放入 demo，讓作者的 weeks/ 被晾在一旁
    const migrated = migrateLegacyStore(path.join(repoRoot, "weeks"), decksDir)
    if (migrated.status === "migrated") {
      console.log(`seed:decks moved weeks/ → ${decksDir}`)
    }
    const result = seedDecksFromDemo(demoDir, decksDir)
    if (result.status === "skipped") {
      console.log(
        `seed:decks skipped: decks directory already exists at ${decksDir}`
      )
      return
    }
    console.log(`seed:decks copied demo → ${decksDir}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`seed:decks failed: ${message}`)
    process.exitCode = 1
  }
}

const cliEntry = process.argv[1]
if (
  cliEntry !== undefined &&
  path.resolve(cliEntry) === fileURLToPath(import.meta.url)
) {
  runCli()
}
