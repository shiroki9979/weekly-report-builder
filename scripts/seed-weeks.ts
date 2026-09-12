import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export type SeedWeeksResult =
  { status: "seeded" } | { status: "skipped"; reason: "target-exists" }

function isErrnoCode(error: unknown, codes: readonly string[]): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false
  }

  return codes.includes((error as { code: unknown }).code as string)
}

function inspectWeeksTarget(
  weeksDir: string
): "absent" | "directory" | "file" | "symlink" {
  try {
    const stat = fs.lstatSync(weeksDir)
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

function isExistingDirectory(weeksDir: string): boolean {
  return inspectWeeksTarget(weeksDir) === "directory"
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

export function seedWeeksFromDemo(
  demoDir: string,
  weeksDir: string
): SeedWeeksResult {
  const target = inspectWeeksTarget(weeksDir)
  if (target === "directory") {
    return { status: "skipped", reason: "target-exists" }
  }
  if (target === "file") {
    throw new Error(`Cannot seed weeks: ${weeksDir} exists and is a file`)
  }
  if (target === "symlink") {
    throw new Error(`Cannot seed weeks: ${weeksDir} exists and is a symlink`)
  }

  if (!isDemoDirectory(demoDir)) {
    throw new Error(`Demo directory not found: ${demoDir}`)
  }

  const parentDir = path.dirname(weeksDir)
  fs.mkdirSync(parentDir, { recursive: true })

  // 先寫入同層暫存再 rename，中斷時不會留下半套 weeks/ 擋住重試
  const tempDir = fs.mkdtempSync(
    path.join(parentDir, `.${path.basename(weeksDir)}-seed-`)
  )

  try {
    copyDirectoryContents(demoDir, tempDir)
    fs.renameSync(tempDir, weeksDir)
    return { status: "seeded" }
  } catch (error) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    // 並行時 loser 的 rename 會撞上 winner 已建立的目錄；此時當 skipped，不得覆寫
    if (
      isErrnoCode(error, ["EEXIST", "ENOTEMPTY", "EPERM"]) &&
      isExistingDirectory(weeksDir)
    ) {
      return { status: "skipped", reason: "target-exists" }
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to seed weeks at ${weeksDir}: ${message}`, {
      cause: error,
    })
  }
}

function resolveRepoRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
}

function runCli(): void {
  // 固定 repo root，避免 postinstall 把測試用的 WEEKS_DIR 當寫入目標
  const repoRoot = resolveRepoRoot()
  const demoDir = path.join(repoRoot, "demo")
  const weeksDir = path.join(repoRoot, "weeks")

  try {
    const result = seedWeeksFromDemo(demoDir, weeksDir)
    if (result.status === "skipped") {
      console.log(
        `seed:weeks skipped: weeks directory already exists at ${weeksDir}`
      )
      return
    }
    console.log(`seed:weeks copied demo → ${weeksDir}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`seed:weeks failed: ${message}`)
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
