import { expect, test, type Page } from "@playwright/test"

import { resetE2eDecks } from "./decks-reset"

test.beforeEach(() => {
  resetE2eDecks()
})

async function unlockEditor(page: Page) {
  await page.getByRole("button", { name: "Edit", exact: true }).click()
}

async function selectFitTableWeek(page: Page) {
  await page.getByRole("combobox", { name: "Deck" }).click()
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

  // 網址帶著 Deck 與頁碼，重新整理後直接回到剛存的草稿頁
  await page.reload()
  await expect(page.getByRole("heading", { name: "Saved draft" })).toBeVisible()
  await expect(page).toHaveURL(/\?deck=2026-08-24&page=2$/)
  await unlockEditor(page)
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
  ).toContainText("p02: Page overflows the 1280 × 720 capture stage")
  await expect(
    page.getByRole("status").filter({ hasText: "Skipped pages" })
  ).toContainText("p03:")
})

test("navigator uses supported Page Position across hidden and unsupported pages", async ({
  page,
  request,
}) => {
  const actions = (id: string, hidden = false) => ({
    id,
    layout: "next-actions",
    title: id,
    hidden,
    commitments: [
      { title: "Ship", outcome: "Pilot ready", checkpoint: "Friday" },
      { title: "Measure", outcome: "Baseline ready", checkpoint: "Monday" },
    ],
  })
  const saved = await request.put("/api/decks/navigation", {
    data: {
      pages: [
        actions("first"),
        actions("hidden", true),
        { id: "unsupported", layout: "future-layout", title: "Future" },
        actions("last"),
      ],
    },
  })
  expect(saved.ok()).toBe(true)
  await page.goto("/?deck=navigation&page=4")

  const navigator = page.getByRole("navigation", { name: "Page navigator" })
  await expect(navigator.getByText("2 / 2", { exact: true })).toBeVisible()
  await expect(page.getByTestId("stage-frame").getByText("2 / 2")).toBeVisible()
  await navigator.getByRole("button", { name: "Previous page" }).click()
  await expect(navigator.getByText(/\d+ \/ \d+/)).toHaveCount(0)
  await navigator.getByRole("button", { name: "Previous page" }).click()
  await expect(
    navigator.getByText("hidden (hidden)", { exact: true })
  ).toBeVisible()
  await expect(navigator.getByText(/\d+ \/ \d+/)).toHaveCount(0)
})
