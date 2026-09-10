import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export function e2eWeeksDir(): string {
  const dir = process.env.E2E_WEEKS_DIR
  if (!dir) {
    throw new Error("E2E_WEEKS_DIR is not set")
  }
  return dir
}

export function resetE2eWeeks(): void {
  const target = e2eWeeksDir()
  const source = path.resolve(rootDir, "fixtures/weeks")
  fs.rmSync(target, { recursive: true, force: true })
  fs.mkdirSync(target, { recursive: true })
  for (const entry of fs.readdirSync(source)) {
    fs.copyFileSync(path.join(source, entry), path.join(target, entry))
  }
}
