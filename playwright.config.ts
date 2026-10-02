import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "@playwright/test"

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const e2eDecksDir =
  process.env.E2E_DECKS_DIR ??
  fs.mkdtempSync(path.join(os.tmpdir(), "wrb-e2e-decks-"))

process.env.E2E_DECKS_DIR = e2eDecksDir

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4179",
    browserName: "chromium",
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: "pnpm dev --host 127.0.0.1 --port 4179 --strictPort",
    url: "http://127.0.0.1:4179",
    reuseExistingServer: false,
    cwd: rootDir,
    env: {
      ...process.env,
      DECKS_DIR: e2eDecksDir,
    },
  },
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
})
