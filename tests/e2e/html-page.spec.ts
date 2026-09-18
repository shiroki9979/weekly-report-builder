import { expect, test, type Page } from "@playwright/test"

import { resetE2eWeeks } from "./weeks-reset"

test.beforeEach(() => {
  resetE2eWeeks()
})

async function unlockEditor(page: Page) {
  await page.getByRole("button", { name: "Edit", exact: true }).click()
}

async function openWeek(page: Page, monday: string, heading: string) {
  await page.goto("/")
  await page.getByRole("combobox", { name: "Week" }).click()
  await page.getByRole("option", { name: monday }).click()
  await expect(page.getByRole("heading", { name: heading })).toBeVisible()
}

test("previews, copies, and batch-exports a valid HTML Page", async ({
  page,
}) => {
  await openWeek(page, "2026-08-31", "Valid HTML Page")
  await expect(
    page.getByTestId("stage-frame").getByRole("heading", {
      name: "Valid HTML Page",
    })
  ).toBeVisible()
  await expect(page.getByRole("alert")).toHaveCount(0)

  await page.getByRole("button", { name: "Copy to clipboard" }).click()
  await expect(
    page.getByRole("button", { name: "Copy to clipboard" })
  ).toBeEnabled()
  await expect(page.getByText("Draft Page", { exact: false })).toHaveCount(0)
  await expect(
    page.getByRole("status").filter({ hasText: "Skipped pages" })
  ).toHaveCount(0)

  await unlockEditor(page)
  await page.getByRole("button", { name: "Download PNGs" }).click()
  await expect(
    page.getByRole("status").filter({ hasText: "Skipped pages" })
  ).toHaveCount(0)
})

test("captures a 404 HTML Page warning and continues the batch", async ({
  page,
}) => {
  await page.goto("/")
  await page.getByRole("combobox", { name: "Week" }).click()
  await page.getByRole("option", { name: "2026-07-27" }).click()
  await expect(
    page
      .getByTestId("stage-frame")
      .getByText("Failed to load HTML file: missing.html")
  ).toBeVisible()

  await page.getByRole("button", { name: "Copy to clipboard" }).click()
  await expect(
    page.getByRole("button", { name: "Copy to clipboard" })
  ).toBeEnabled()
  await expect(
    page.getByRole("status").filter({ hasText: "Skipped pages" })
  ).toHaveCount(0)

  await unlockEditor(page)
  await page.getByRole("button", { name: "Download PNGs" }).click()
  await expect(
    page.getByRole("status").filter({ hasText: "Skipped pages" })
  ).toHaveCount(0)
})

test("clones HTML Page files and clears title and notes", async ({ page }) => {
  await openWeek(page, "2026-08-31", "Valid HTML Page")
  await unlockEditor(page)

  await page.getByRole("button", { name: "Create week" }).click()
  await expect(page.getByRole("combobox", { name: "Week" })).toContainText(
    "2026-09-07"
  )
  await expect(
    page.getByTestId("stage-frame").getByRole("heading", {
      name: "Valid HTML Page",
    })
  ).toBeVisible()

  await unlockEditor(page)
  await expect(
    page.getByRole("textbox", { name: "Title", exact: true })
  ).toHaveValue("")
  await expect(page.getByRole("textbox", { name: "HTML file" })).toHaveValue(
    "ok.html"
  )
  await expect(
    page.getByRole("textbox", { name: "Speaker notes" })
  ).toHaveValue("")
})
