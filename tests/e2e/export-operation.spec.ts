import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { expect, test, type Page } from "@playwright/test"

import { e2eWeeksDir, resetE2eWeeks } from "./weeks-reset"

test.beforeEach(() => {
  resetE2eWeeks()
})

test("keeps the original Page Position and download week after switching weeks", async ({
  page,
}) => {
  const weekPath = path.join(e2eWeeksDir(), "2026-08-31.json")
  const week = JSON.parse(readFileSync(weekPath, "utf8"))
  week.pages[0].showPageNumber = true
  writeFileSync(weekPath, JSON.stringify(week))

  await openHtmlWeek(page)
  const request = await holdHtmlRequest(page)
  const downloads: string[] = []
  page.on("download", (download) =>
    downloads.push(download.suggestedFilename())
  )

  await page.getByRole("button", { name: "Download PNGs" }).click()
  await request.started
  await expect(
    page.getByRole("button", { name: "Copy to clipboard" })
  ).toBeDisabled()
  const capture = page.locator("[aria-hidden='true'] [data-stage-capture-root]")
  await expect(capture).toContainText("1 / 2")

  await page.getByRole("combobox", { name: "Week" }).click()
  await page.getByRole("option", { name: "2026-08-24" }).click()
  await expect(page.getByRole("heading", { name: "Fit table" })).toBeVisible()
  await expect(capture).toContainText("1 / 2")

  request.release()
  await expect
    .poll(() => downloads)
    .toEqual(["2026-08-31-p01.png", "2026-08-31-p02.png"])
  await expect(capture).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "Download PNGs" })
  ).toBeEnabled()
  await expect(
    page.getByRole("status").filter({ hasText: "Downloads triggered" })
  ).toContainText(
    "Export for 2026-08-31: Downloads triggered: 2; Skipped: 0; Failed: 0; Not attempted: 0."
  )
})

async function holdHtmlRequest(page: Page) {
  let releaseRequest!: () => void
  let requestStarted!: () => void
  const started = new Promise<void>((resolve) => {
    requestStarted = resolve
  })
  const released = new Promise<void>((resolve) => {
    releaseRequest = resolve
  })
  await page.route("**/weeks/2026-08-31/ok.html", async (route) => {
    requestStarted()
    await released
    await route.continue()
  })
  return { started, release: () => releaseRequest() }
}

async function openHtmlWeek(page: Page) {
  await page.goto("/")
  await page.getByRole("combobox", { name: "Week" }).click()
  await page.getByRole("option", { name: "2026-08-31" }).click()
  await expect(
    page.getByRole("heading", { name: "Valid HTML Page" })
  ).toBeVisible()
}

test("exports the starting page order after a page is moved mid-export", async ({
  page,
}) => {
  await openHtmlWeek(page)
  const request = await holdHtmlRequest(page)
  const downloads: string[] = []
  page.on("download", (download) =>
    downloads.push(download.suggestedFilename())
  )

  await page.getByRole("button", { name: "Download PNGs" }).click()
  await request.started
  await page.getByRole("button", { name: "Edit", exact: true }).click()
  await page.getByRole("button", { name: "Move down" }).click()
  await expect(page.getByRole("button", { name: "Move down" })).toBeDisabled()

  request.release()
  await expect
    .poll(() => downloads)
    .toEqual(["2026-08-31-p01.png", "2026-08-31-p02.png"])
  await expect(
    page.getByRole("status").filter({ hasText: "Downloads triggered" })
  ).toContainText(
    "Export for 2026-08-31: Downloads triggered: 2; Skipped: 0; Failed: 0; Not attempted: 0."
  )
})

test("leaves no capture host, late download, or stale result after the Workshop is torn down mid-export", async ({
  page,
}) => {
  await openHtmlWeek(page)
  const request = await holdHtmlRequest(page)
  const downloads: string[] = []
  page.on("download", (download) =>
    downloads.push(download.suggestedFilename())
  )

  await page.getByRole("button", { name: "Download PNGs" }).click()
  await request.started
  await page.reload()
  request.release()
  await page.getByRole("combobox", { name: "Week" }).click()
  await page.getByRole("option", { name: "2026-08-31" }).click()
  await expect(
    page.getByRole("heading", { name: "Valid HTML Page" })
  ).toBeVisible()

  await expect(
    page.getByRole("button", { name: "Download PNGs" })
  ).toBeEnabled()
  await expect(
    page.locator("[aria-hidden='true'] [data-stage-capture-root]")
  ).toHaveCount(0)
  await expect(
    page.getByRole("status").filter({ hasText: "Downloads triggered" })
  ).toHaveCount(0)
  expect(downloads).toEqual([])
})
