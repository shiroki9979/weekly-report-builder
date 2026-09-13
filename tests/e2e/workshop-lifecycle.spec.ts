import { expect, test, type Page } from "@playwright/test"

import { resetE2eWeeks } from "./weeks-reset"

test.beforeEach(() => {
  resetE2eWeeks()
})

async function unlockEditor(page: Page) {
  await page.getByRole("button", { name: "Edit", exact: true }).click()
}

async function selectFitTableWeek(page: Page) {
  await page.getByRole("combobox", { name: "Week" }).click()
  await page.getByRole("option", { name: "2026-08-24" }).click()
  await expect(page.getByRole("heading", { name: "Fit table" })).toBeVisible()
}

async function openFitTableWeek(page: Page) {
  await page.goto("/")
  await selectFitTableWeek(page)
}

test("adds a page, saves it, and reloads the same draft", async ({ page }) => {
  await openFitTableWeek(page)

  await unlockEditor(page)
  await page.getByRole("button", { name: "Add page" }).click()
  await expect(page.getByRole("alert")).toContainText("Draft Page")

  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Saved draft")
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Saved", { exact: true })).toBeVisible()

  await page.reload()
  await selectFitTableWeek(page)
  await unlockEditor(page)
  await page.getByRole("combobox", { name: "Page", exact: true }).click()
  await page.getByRole("option", { name: "Saved draft" }).click()
  await expect(
    page.getByRole("textbox", { name: "Title", exact: true })
  ).toHaveValue("Saved draft")
})

test("blocks copy of a draft page and skips overflow during batch export", async ({
  page,
}) => {
  await openFitTableWeek(page)
  await unlockEditor(page)
  await page.getByRole("button", { name: "Add page" }).click()
  await page.getByRole("button", { name: "Copy to clipboard" }).click()
  await expect(
    page.getByText("title: Title is required;", { exact: false })
  ).toBeVisible()

  await page.getByRole("button", { name: "Download PNGs" }).click()
  await expect(
    page.getByRole("status").filter({ hasText: "Skipped pages" })
  ).toContainText("p02: Overflowing Page")
  await expect(
    page.getByRole("status").filter({ hasText: "Skipped pages" })
  ).toContainText("p03:")
})
