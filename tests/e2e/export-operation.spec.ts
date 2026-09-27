import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { expect, test } from "@playwright/test"

import { e2eWeeksDir, resetE2eWeeks } from "./weeks-reset"

test.beforeEach(() => {
  resetE2eWeeks()
})

test("keeps the original Stage Page Position and download week after switching weeks", async ({
  page,
}) => {
  const weekPath = path.join(e2eWeeksDir(), "2026-08-31.json")
  const week = JSON.parse(readFileSync(weekPath, "utf8"))
  week.pages[0].showPageNumber = true
  writeFileSync(weekPath, JSON.stringify(week))

  await page.goto("/")
  await page.getByRole("combobox", { name: "Week" }).click()
  await page.getByRole("option", { name: "2026-08-31" }).click()
  await expect(
    page.getByRole("heading", { name: "Valid HTML Page" })
  ).toBeVisible()

  let releaseRequest!: () => void
  let requestStarted!: () => void
  const requestStartedPromise = new Promise<void>((resolve) => {
    requestStarted = resolve
  })
  const releasePromise = new Promise<void>((resolve) => {
    releaseRequest = resolve
  })
  await page.route("**/weeks/2026-08-31/ok.html", async (route) => {
    requestStarted()
    await releasePromise
    await route.continue()
  })
  const downloads: string[] = []
  page.on("download", (download) =>
    downloads.push(download.suggestedFilename())
  )

  await page.getByRole("button", { name: "Download PNGs" }).click()
  await requestStartedPromise
  await expect(
    page.getByRole("button", { name: "Copy to clipboard" })
  ).toBeDisabled()
  const capture = page.locator("[aria-hidden='true'] [data-stage-capture-root]")
  await expect(capture).toContainText("1 / 2")

  await page.getByRole("combobox", { name: "Week" }).click()
  await page.getByRole("option", { name: "2026-08-24" }).click()
  await expect(page.getByRole("heading", { name: "Fit table" })).toBeVisible()
  await expect(capture).toContainText("1 / 2")

  releaseRequest()
  await expect
    .poll(() => downloads)
    .toEqual(["2026-08-31-p01.png", "2026-08-31-p02.png"])
  await expect(capture).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "Download PNGs" })
  ).toBeEnabled()
})
