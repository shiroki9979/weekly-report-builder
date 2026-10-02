import fs from "node:fs"

export default function globalTeardown(): void {
  const dir = process.env.E2E_DECKS_DIR
  if (dir) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}
