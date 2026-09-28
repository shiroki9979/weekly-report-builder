import { expect, test } from "@playwright/test"

import { resetE2eWeeks } from "./weeks-reset"

test.beforeEach(() => resetE2eWeeks())

test("collapses and expands speaker notes from the title row", async ({
  page,
}) => {
  await page.goto("/")
  const toggle = page.getByRole("button", { name: /Speaker notes/i })
  await expect(toggle).toHaveAttribute("aria-expanded", "true")

  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-expanded", "false")

  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-expanded", "true")
})

test("collapses and expands the editor panel from the header", async ({
  page,
}) => {
  await page.goto("/")
  const sidebarLabel = page.getByText("Sidebar", { exact: true })
  await expect(sidebarLabel).toBeVisible()

  await page.getByRole("button", { name: "Collapse editor panel" }).click()
  await expect(
    page.getByRole("button", { name: "Expand editor panel" })
  ).toHaveAttribute("aria-pressed", "true")
  await expect(sidebarLabel).toBeHidden()

  await page.getByRole("button", { name: "Expand editor panel" }).click()
  await expect(sidebarLabel).toBeVisible()
})
