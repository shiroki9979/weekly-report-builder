import { expect, test, type Download } from "@playwright/test"
import { readdirSync, readFileSync, rmSync } from "node:fs"
import { resolve } from "node:path"

import { parseDeck } from "../../src/lib/deck"
import { seedDecksFromDemo } from "../../scripts/seed-decks"
import { e2eDecksDir } from "./decks-reset"
import { fitAtCaptureSize } from "./stage-capture"

const demoDir = resolve(import.meta.dirname, "../../demo")

const demoDecks = readdirSync(demoDir)
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => ({
    id: name.replace(/\.json$/, ""),
    deck: parseDeck(JSON.parse(readFileSync(resolve(demoDir, name), "utf8"))),
  }))

test.beforeEach(() => {
  rmSync(e2eDecksDir(), { recursive: true, force: true })
  expect(seedDecksFromDemo(demoDir, e2eDecksDir())).toEqual({
    status: "seeded",
  })
})

// 每份示範 Deck 都要能在 1280 × 720 放下每一頁並整份匯出；這是 Demo Deck Set 的不變式
for (const { id, deck } of demoDecks) {
  test(`fresh ${id} demo fits every page and exports all of them`, async ({
    page,
  }) => {
    test.slow()
    await page.goto(`/?deck=${id}`)
    await expect(
      page.getByRole("combobox", { name: "Deck", exact: true })
    ).toContainText(id)

    for (const [index, entry] of deck.pages.entries()) {
      await page
        .getByRole("button", { name: `Go to page ${index + 1}`, exact: true })
        .click()
      const stage = page.getByTestId("stage-frame")
      // HTML Page 的標題只在 navigator 顯示；Stage 上以片段載入完成為準
      if (entry.layout === "html")
        await expect(
          stage.locator(
            '[data-testid="html-slide-shadow"][data-status="ready"]'
          )
        ).toBeVisible()
      else
        await expect(
          stage.getByRole("heading", { name: entry.title, exact: true })
        ).toBeVisible()
      await fitAtCaptureSize(page)
    }

    const downloads: Download[] = []
    page.on("download", (download) => downloads.push(download))
    await page
      .getByRole("button", { name: "Download PNGs", exact: true })
      .click()
    await expect
      .poll(() => downloads.map((download) => download.suggestedFilename()), {
        timeout: 60_000,
      })
      .toEqual(deck.pages.map((entry) => `${id}-${entry.id}.png`))
    for (const download of downloads) {
      const path = test.info().outputPath(download.suggestedFilename())
      await download.saveAs(path)
      const bytes = readFileSync(path)
      expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a")
      expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([
        2560, 1440,
      ])
    }
    await expect(
      page.getByRole("status").filter({ hasText: "Skipped pages" })
    ).toHaveCount(0)
  })
}
