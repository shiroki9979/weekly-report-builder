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
  await expect(page.getByRole("alert")).toContainText("Draft Page")
  await expect(page.getByRole("button", { name: "Add metric" })).toBeDisabled()
  await expect(
    page.getByRole("button", { name: "Add interpretation" })
  ).toBeDisabled()

  await page
    .getByRole("group", { name: "Metric 2" })
    .getByRole("button", { name: "Remove" })
    .click()
  await expect(page.getByRole("button", { name: "Add metric" })).toBeEnabled()
  await expect(
    page.getByRole("group", { name: "Metric 1" }).getByRole("button", {
      name: "Remove",
    })
  ).toBeDisabled()
  await page.getByRole("button", { name: "Add metric" }).click()
  await expect(page.getByRole("button", { name: "Add metric" })).toBeDisabled()
  await expect(page.getByRole("group", { name: "Metric 2" })).toBeVisible()

  await page
    .getByRole("group", { name: "Interpretation 2" })
    .getByRole("button", { name: "Remove" })
    .click()
  await expect(
    page.getByRole("button", { name: "Add interpretation" })
  ).toBeEnabled()
  await expect(
    page.getByRole("group", { name: "Interpretation 1" }).getByRole("button", {
      name: "Remove",
    })
  ).toBeDisabled()
  await page.getByRole("button", { name: "Add interpretation" }).click()
  await expect(
    page.getByRole("button", { name: "Add interpretation" })
  ).toBeDisabled()

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
  await expect(skipped).toContainText(
    "p04: Page overflows the 1280 × 720 capture stage"
  )
  await expect(skipped).not.toContainText("p01:")
  await expect(skipped).not.toContainText("p02:")
  await expect(skipped).not.toContainText("p03:")
})

test("blocks copy of an overflowing evidence-backed decision", async ({
  page,
}) => {
  await openDecisionWeek(page)
  await page.getByRole("combobox", { name: "Page", exact: true }).click()
  await page.getByRole("option", { name: "Overflow decision" }).click()
  await expect(
    page.getByRole("heading", { name: "Overflow decision" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Copy to clipboard" }).click()
  await expect(
    page.locator("p[role='alert']").filter({
      hasText: "Page overflows the 1280 × 720 capture stage",
    })
  ).toBeVisible()
})

test("does not treat a complete evidence-backed decision as missing content on copy", async ({
  page,
}) => {
  await openDecisionWeek(page)
  await page.getByRole("button", { name: "Copy to clipboard" }).click()
  await expect(
    page.getByRole("button", { name: "Copy to clipboard" })
  ).toBeEnabled()
  await expect(
    page.getByText("title: Title is required", { exact: false })
  ).toHaveCount(0)
  await expect(
    page.getByText("Draft Page — missing required content")
  ).toHaveCount(0)
})

test("blocks copy when a Metric Input is invalid", async ({ page }) => {
  await openDecisionWeek(page)
  await unlockEditor(page)
  await page.getByRole("textbox", { name: "Baseline" }).fill("abc")
  await expect(page.getByRole("alert")).toContainText(
    "metrics[0].baselineValue: Metric value must be a finite non-negative number"
  )
  await page.getByRole("button", { name: "Copy to clipboard" }).click()
  await expect(
    page.locator("p[role='alert']").filter({
      hasText:
        "metrics[0].baselineValue: Metric value must be a finite non-negative number",
    })
  ).toBeVisible()
})
