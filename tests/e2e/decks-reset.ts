import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export function e2eDecksDir(): string {
  const dir = process.env.E2E_DECKS_DIR
  if (!dir) {
    throw new Error("E2E_DECKS_DIR is not set")
  }
  return dir
}

export function resetE2eDecks(): void {
  const target = e2eDecksDir()
  const source = path.resolve(rootDir, "fixtures/decks")
  fs.rmSync(target, { recursive: true, force: true })
  fs.cpSync(source, target, { recursive: true })
}
