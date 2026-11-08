import { expect, test, type Download } from "@playwright/test"
import { readFileSync, rmSync } from "node:fs"
import { resolve } from "node:path"

import { seedDecksFromDemo } from "../../scripts/seed-decks"
import { readDemoDecks } from "../demo-decks"
import { e2eDecksDir } from "./decks-reset"
import { fitAtCaptureSize } from "./stage-capture"
import { parseDeck } from "../../src/lib/deck"

const demoDir = resolve(import.meta.dirname, "../../demo")
const demoDecks = readDemoDecks(demoDir)

test.beforeEach(() => {
  rmSync(e2eDecksDir(), { recursive: true, force: true })
  expect(seedDecksFromDemo(demoDir, e2eDecksDir())).toEqual({
    status: "seeded",
  })
})

test("starts on Default, creates the first week from the selected Deck, then uses the latest week", async ({
  page,
  request,
}) => {
  await page.goto("/")
  const picker = page.getByRole("combobox", { name: "Deck", exact: true })
  await expect(picker).toContainText("demo-default")
  await picker.click()
  await page
    .getByRole("option", { name: "demo-observatory", exact: true })
    .click()
  await expect(
    page.getByRole("textbox", { name: "Deck Title", exact: true })
  ).toHaveValue("Demo · Observatory")
  await page.getByRole("button", { name: "Edit", exact: true }).click()
  await expect(page.getByLabel("New week (Monday)")).toHaveValue("")
  await page.getByLabel("New week (Monday)").fill("2026-01-12")
  await page.getByRole("button", { name: "Create week", exact: true }).click()
  await expect(picker).toContainText("2026-01-12")

  const firstWeek = parseDeck(
    await (await request.get("/decks/2026-01-12.json")).json()
  )
  expect(firstWeek.theme).toBe("observatory")
  expect(firstWeek.title).toBe("Demo · Observatory")
  expect(firstWeek.period).toEqual({ start: "2026-01-12", end: "2026-01-16" })
  expect(firstWeek.pages).toHaveLength(10)
  expect(firstWeek.pages.every((entry) => entry.title === "")).toBe(true)
  const html = await request.get("/decks/2026-01-12/timeline.html")
  expect(html.ok()).toBe(true)
  expect(await html.text()).toBe(
    readFileSync(resolve(demoDir, "demo-observatory/timeline.html"), "utf8")
  )

  await picker.click()
  await page.getByRole("option", { name: "demo-default", exact: true }).click()
  await expect(
    page.getByRole("textbox", { name: "Deck Title", exact: true })
  ).toHaveValue("Demo · Default")
  await page.getByRole("button", { name: "Edit", exact: true }).click()
  await expect(page.getByLabel("New week (Monday)")).toHaveValue("2026-01-19")
  await page.getByRole("button", { name: "Create week", exact: true }).click()
  await expect(picker).toContainText("2026-01-19")
  const nextWeek = parseDeck(
    await (await request.get("/decks/2026-01-19.json")).json()
  )
  expect(nextWeek.theme).toBe("observatory")
  expect(nextWeek.pages).toHaveLength(10)
  await page.goto("/")
  await expect(picker).toContainText("2026-01-19")
})

test("rejects invalid first-week templates without writing a Deck", async ({
  request,
}) => {
  for (const templateId of [42, "../outside", "missing-template"]) {
    const response = await request.post("/api/decks/2026-01-12", {
      data: { templateId },
    })
    expect(response.status()).toBe(400)
    expect(await response.json()).toHaveProperty("error", expect.any(String))
  }
  const missingTemplate = await request.post("/api/decks/2026-01-12")
  expect(missingTemplate.status()).toBe(400)
  expect(await (await request.get("/api/decks")).json()).toEqual({
    decks: ["demo-default", "demo-observatory"],
  })
})

test("keeps bodyless creation for later weeks and reports duplicate targets", async ({
  request,
}) => {
  const first = await request.post("/api/decks/2026-01-12", {
    data: { templateId: "demo-default" },
  })
  expect(first.status()).toBe(201)
  const next = await request.post("/api/decks/2026-01-19")
  expect(next.status()).toBe(201)
  expect(parseDeck((await next.json()).deck).pages).toHaveLength(12)
  const duplicate = await request.post("/api/decks/2026-01-19")
  expect(duplicate.status()).toBe(409)
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
