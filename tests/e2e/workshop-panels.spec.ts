import { expect, test } from "@playwright/test"

import { resetE2eDecks } from "./decks-reset"

test.beforeEach(() => resetE2eDecks())

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

test("keeps speaker notes collapsed when the viewport size changes", async ({
  page,
}) => {
  await page.goto("/")
  const toggle = page.getByRole("button", { name: /Speaker notes/i })
  await expect(toggle).toHaveAttribute("aria-expanded", "true")
  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-expanded", "false")

  const notes = page.getByText("No speaker notes", { exact: true })

  for (const viewport of [
    { width: 1440, height: 875 },
    { width: 1440, height: 1200 },
    { width: 1024, height: 768 },
    { width: 1440, height: 600 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })
    )

    await expect(toggle).toHaveAttribute("aria-expanded", "false")
    await expect(notes).toBeHidden()
  }

  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-expanded", "true")
  await expect(notes).toBeVisible()
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
