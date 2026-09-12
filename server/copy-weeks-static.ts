import fs from "node:fs"
import path from "node:path"

const MONDAY_DIR = /^\d{4}-\d{2}-\d{2}$/

export function copyWeeksForProductionBuild(
  weeksDir: string,
  outputDir: string
): void {
  // 先確認 runtime store 存在，避免 build 隱含 seed 或先寫出空的 dist/weeks
  if (!fs.existsSync(weeksDir)) {
    throw new Error(
      `Runtime weeks store is missing at ${weeksDir}. Run \`pnpm seed:weeks\` before building; production build does not seed or create weeks/.`
    )
  }

  fs.mkdirSync(outputDir, { recursive: true })

  for (const entry of fs.readdirSync(weeksDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".json")) {
      fs.copyFileSync(
        path.resolve(weeksDir, entry.name),
        path.resolve(outputDir, entry.name)
      )
    } else if (entry.isDirectory() && MONDAY_DIR.test(entry.name)) {
      const targetSubDir = path.resolve(outputDir, entry.name)
      fs.mkdirSync(targetSubDir, { recursive: true })
      const sourceSubDir = path.resolve(weeksDir, entry.name)
      for (const file of fs.readdirSync(sourceSubDir)) {
        if (file.endsWith(".html")) {
          fs.copyFileSync(
            path.resolve(sourceSubDir, file),
            path.resolve(targetSubDir, file)
          )
        }
      }
    }
  }
}
