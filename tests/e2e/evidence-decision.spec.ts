import { expect, test, type Page } from "@playwright/test"

import { resetE2eWeeks } from "./weeks-reset"

test.beforeEach(() => {
  resetE2eWeeks()
})

async function unlockEditor(page: Page) {
  await page.getByRole("button", { name: "Edit", exact: true }).click()
}

async function openDecisionWeek(page: Page) {
  await page.goto("/")
  await page.getByRole("combobox", { name: "Week" }).click()
  await page.getByRole("option", { name: "2026-08-10" }).click()
  await expect(
    page.getByRole("heading", {
      name: "Ship the candidate. The baseline is slower.",
    })
  ).toBeVisible()
}

test("renders English, Chinese, and mixed evidence-backed decision pages", async ({
  page,
}) => {
  await openDecisionWeek(page)
  await expect(
    page.getByTestId("stage-frame").getByText("Evidence-backed Decision")
  ).toBeVisible()
  await expect(page.getByText("Adopt the candidate.")).toBeVisible()
  await expect(page.getByText("9.4 days")).toBeVisible()
  await expect(page.getByText("5.1 days")).toBeVisible()

  await page.getByRole("combobox", { name: "Page", exact: true }).click()
  await page
    .getByRole("option", { name: "採用候選方案。基準較慢且較不穩。" })
    .click()
  await expect(page.getByText("採用候選方案。", { exact: true })).toBeVisible()
  await expect(page.getByText("9.4 天")).toBeVisible()

  await page.getByRole("combobox", { name: "Page", exact: true }).click()
  await page
    .getByRole("option", { name: "Ship the candidate。基準較慢且較不穩。" })
    .click()
  await expect(
    page.getByText("Adopt the candidate。採用候選方案。")
  ).toBeVisible()
  await expect(page.getByText("9.4 days")).toBeVisible()
  await expect(page.getByText("候選方案把故障壓低。")).toBeVisible()
})

test("adds, saves, and reloads an evidence-backed decision draft", async ({
  page,
}) => {
  await openDecisionWeek(page)
  await unlockEditor(page)
  await page.getByRole("combobox", { name: "Add page" }).click()
  await page.getByRole("option", { name: "Evidence-backed Decision" }).click()
  await page.getByRole("button", { name: "Add page" }).click()
  await expect(page.getByRole("alert")).toContainText("Draft page")
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Saved decision")
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Saved", { exact: true })).toBeVisible()

  await page.reload()
  await page.getByRole("combobox", { name: "Week" }).click()
  await page.getByRole("option", { name: "2026-08-10" }).click()
  await unlockEditor(page)
  await page.getByRole("combobox", { name: "Page", exact: true }).click()
  await page.getByRole("option", { name: "Saved decision" }).click()
  await expect(
    page.getByRole("textbox", { name: "Title", exact: true })
  ).toHaveValue("Saved decision")
})

test("skips an overflowing evidence-backed decision during batch export", async ({
  page,
}) => {
  await openDecisionWeek(page)
  await unlockEditor(page)
  await page.getByRole("button", { name: "Download PNGs" }).click()
  const skipped = page.getByRole("status").filter({ hasText: "Skipped pages" })
  await expect(skipped).toContainText("p04: overflow")
  await expect(skipped).not.toContainText("p01:")
  await expect(skipped).not.toContainText("p02:")
})
