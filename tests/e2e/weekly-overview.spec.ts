import { expect, test, type Page } from "@playwright/test"

import { resetE2eWeeks } from "./weeks-reset"

test.beforeEach(() => {
  resetE2eWeeks()
})

async function unlockEditor(page: Page) {
  await page.getByRole("button", { name: "Edit", exact: true }).click()
}

async function openOverviewWeek(page: Page) {
  await page.goto("/")
  await page.getByRole("combobox", { name: "Week" }).click()
  await page.getByRole("option", { name: "2026-08-17" }).click()
  await expect(
    page.getByRole("heading", {
      name: "Delivery recovered, and the week closed with two durable gains.",
    })
  ).toBeVisible()
}

test("renders English, Chinese, and mixed weekly overview pages", async ({
  page,
}) => {
  await openOverviewWeek(page)

  await expect(
    page.getByTestId("stage-frame").getByText("Weekly Overview")
  ).toBeVisible()
  await expect(page.getByText("2026-08-17 — 2026-08-21")).toBeVisible()
  await expect(page.getByText("Delivery", { exact: true })).toBeVisible()
  await expect(page.getByText("Accuracy", { exact: true })).toBeVisible()

  await page.getByRole("combobox", { name: "Page", exact: true }).click()
  await page
    .getByRole("option", { name: "交付回穩，本週收斂兩項可延續成果。" })
    .click()
  await expect(
    page.getByRole("heading", { name: "交付回穩，本週收斂兩項可延續成果。" })
  ).toBeVisible()
  await expect(page.getByText("交付", { exact: true })).toBeVisible()
  await expect(page.getByText("準確度", { exact: true })).toBeVisible()
  await expect(page.getByText("穩定度", { exact: true })).toBeVisible()

  await page.getByRole("combobox", { name: "Page", exact: true }).click()
  await page
    .getByRole("option", {
      name: "Delivery recovered，本週收斂 two durable gains.",
    })
    .click()
  await expect(page.getByText("Delivery 交付")).toBeVisible()
  await expect(page.getByText("Capacity")).toBeVisible()
  await expect(page.getByText("3 slots")).toBeVisible()
})

test("adds, saves, and reloads a weekly overview draft", async ({ page }) => {
  await openOverviewWeek(page)
  await unlockEditor(page)

  await page.getByRole("combobox", { name: "Add page" }).click()
  await page.getByRole("option", { name: "Weekly Overview" }).click()
  await page.getByRole("button", { name: "Add page" }).click()

  await expect(page.getByRole("alert")).toContainText("Draft Page")
  await expect(
    page.getByRole("textbox", { name: "Title", exact: true })
  ).toHaveAttribute("aria-invalid", "true")
  await expect(page.getByRole("button", { name: "Make lead" })).toHaveCount(2)

  await page.getByRole("button", { name: "Add supporting outcome" }).click()
  await expect(page.getByRole("button", { name: "Make lead" })).toHaveCount(3)
  await expect(
    page.getByRole("button", { name: "Add supporting outcome" })
  ).toBeDisabled()

  await page.getByRole("button", { name: "Remove" }).nth(2).click()
  await page.getByRole("button", { name: "Remove" }).nth(1).click()
  await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(1)
  await expect(page.getByRole("button", { name: "Remove" })).toBeDisabled()
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Saved overview")
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Saved", { exact: true })).toBeVisible()

  await page.reload()
  await page.getByRole("combobox", { name: "Week" }).click()
  await page.getByRole("option", { name: "2026-08-17" }).click()
  await unlockEditor(page)
  await page.getByRole("combobox", { name: "Page", exact: true }).click()
  await page.getByRole("option", { name: "Saved overview" }).click()
  await expect(
    page.getByRole("textbox", { name: "Title", exact: true })
  ).toHaveValue("Saved overview")
  await expect(
    page.getByRole("button", { name: "Add supporting outcome" })
  ).toBeVisible()
})

test("skips an overflowing weekly overview during batch export", async ({
  page,
}) => {
  await openOverviewWeek(page)
  await unlockEditor(page)
  await page.getByRole("button", { name: "Download PNGs" }).click()
  const skipped = page.getByRole("status").filter({ hasText: "Skipped pages" })
  await expect(skipped).toContainText("p04: Overflowing Page")
  await expect(skipped).not.toContainText("p01:")
  await expect(skipped).not.toContainText("p02:")
  await expect(skipped).not.toContainText("p03:")
})
