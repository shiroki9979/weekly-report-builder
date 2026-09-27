import { expect, test, type Page } from "@playwright/test"

import { resetE2eWeeks } from "./weeks-reset"

test.beforeEach(() => {
  resetE2eWeeks()
})

async function unlockEditor(page: Page) {
  await page.getByRole("button", { name: "Edit", exact: true }).click()
}

async function openActionsWeek(page: Page) {
  await page.goto("/")
  await page.getByRole("combobox", { name: "Week" }).click()
  await page.getByRole("option", { name: "2026-08-03" }).click()
  await expect(
    page.getByRole("heading", {
      name: "Five-day reviews and a held reserve.",
    })
  ).toBeVisible()
}

test("renders English, Chinese, and mixed next-actions pages", async ({
  page,
}) => {
  await openActionsWeek(page)
  await expect(
    page.getByTestId("stage-frame").getByText("Next Actions")
  ).toBeVisible()
  await expect(
    page.getByTestId("stage-frame").getByText("01", { exact: true })
  ).toBeVisible()
  await expect(page.getByText("Stabilize the review queue")).toBeVisible()

  await page.getByRole("combobox", { name: "Page", exact: true }).click()
  await page
    .getByRole("option", { name: "五日審查、少漏接、守住備援。" })
    .click()
  await expect(page.getByText("穩住審查佇列")).toBeVisible()
  await expect(
    page.getByTestId("stage-frame").getByText("03", { exact: true })
  ).toBeVisible()

  await page.getByRole("combobox", { name: "Page", exact: true }).click()
  await page
    .getByRole("option", {
      name: "Five-day reviews，少漏接，and a held reserve.",
    })
    .click()
  await expect(page.getByText("Stabilize 審查佇列")).toBeVisible()
  await expect(
    page.getByTestId("stage-frame").getByText("04", { exact: true })
  ).toBeVisible()
})

test("adds, saves, and reloads a next-actions draft", async ({ page }) => {
  await openActionsWeek(page)
  await unlockEditor(page)
  await page.getByRole("combobox", { name: "Add page" }).click()
  await page.getByRole("option", { name: "Next Actions" }).click()
  await page.getByRole("button", { name: "Add page" }).click()
  await expect(page.getByRole("alert")).toContainText("Draft Page")
  await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(3)

  await page.getByRole("button", { name: "Add commitment" }).click()
  await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(4)
  await expect(
    page.getByRole("button", { name: "Add commitment" })
  ).toBeDisabled()

  await page.getByRole("button", { name: "Remove" }).nth(3).click()
  await page.getByRole("button", { name: "Remove" }).nth(2).click()
  await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(2)
  await expect(
    page.getByRole("button", { name: "Remove" }).first()
  ).toBeDisabled()

  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Saved actions")
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Saved", { exact: true })).toBeVisible()

  await page.reload()
  await page.getByRole("combobox", { name: "Week" }).click()
  await page.getByRole("option", { name: "2026-08-03" }).click()
  await unlockEditor(page)
  await page.getByRole("combobox", { name: "Page", exact: true }).click()
  await page.getByRole("option", { name: "Saved actions" }).click()
  await expect(
    page.getByRole("textbox", { name: "Title", exact: true })
  ).toHaveValue("Saved actions")
})

test("skips an overflowing next-actions page during batch export", async ({
  page,
}) => {
  await openActionsWeek(page)
  await unlockEditor(page)
  await page.getByRole("button", { name: "Download PNGs" }).click()
  const skipped = page.getByRole("status").filter({ hasText: "Skipped pages" })
  await expect(skipped).toContainText(
    "p04: Page overflows the 1280 × 720 capture stage"
  )
  await expect(skipped).not.toContainText("p01:")
  await expect(skipped).not.toContainText("p02:")
  await expect(skipped).not.toContainText("p03:")
})
