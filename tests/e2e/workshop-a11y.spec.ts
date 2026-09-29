import { expect, test, type Page } from "@playwright/test"

import { resetE2eDecks } from "./decks-reset"

test.beforeEach(() => {
  resetE2eDecks()
})

async function unlockEditor(page: Page) {
  await page.getByRole("button", { name: "Edit", exact: true }).click()
}

async function openDeck(page: Page, monday: string, heading: string) {
  await page.goto("/")
  await page.getByRole("combobox", { name: "Deck" }).click()
  await page.getByRole("option", { name: monday }).click()
  await expect(page.getByRole("heading", { name: heading })).toBeVisible()
}

async function assertPreviewFits800x450(page: Page) {
  const frame = page.getByTestId("stage-frame")
  await expect(frame).toBeVisible()
  const box = await frame.evaluate((element) => {
    const node = element as HTMLElement
    node.style.width = "800px"
    node.style.maxWidth = "800px"
    node.style.height = "450px"
    return {
      width: Math.round(node.getBoundingClientRect().width),
      height: Math.round(node.getBoundingClientRect().height),
      scrollWidth: node.scrollWidth,
      scrollHeight: node.scrollHeight,
      clientWidth: node.clientWidth,
      clientHeight: node.clientHeight,
    }
  })
  expect(box.width).toBe(800)
  expect(box.height).toBe(450)
  expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth + 1)
  expect(box.scrollHeight).toBeLessThanOrEqual(box.clientHeight + 1)
}

async function assertCopyFits1280Capture(page: Page) {
  await page.getByRole("button", { name: "Copy to clipboard" }).click()
  await expect(
    page.getByRole("button", { name: "Copy to clipboard" })
  ).toBeEnabled()
  await expect(
    page.locator("p[role='alert']").filter({
      hasText: "Page overflows the 1280 × 720 capture stage",
    })
  ).toHaveCount(0)
}

test("reaches lifecycle controls from the keyboard and confirms delete in a dialog", async ({
  page,
}) => {
  await openDeck(page, "2026-08-24", "Fit table")
  await unlockEditor(page)

  const addPage = page.getByRole("button", { name: "Add page" })
  await addPage.focus()
  await expect(addPage).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(page.getByRole("button", { name: "Move down" })).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(page.getByRole("button", { name: "Delete page" })).toBeFocused()

  await page.keyboard.press("Enter")
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText("Fit table")
  await expect(dialog).toContainText("two-column")
  await dialog.getByRole("button", { name: /^Delete$/ }).click()
  await expect(dialog).toHaveCount(0)
  await expect(
    page.getByRole("heading", { name: "Overflow table" })
  ).toBeVisible()
})

test("fits English, Chinese, and mixed Editorial Layout Family pages at 800 × 450 and 1280 × 720", async ({
  page,
}) => {
  await openDeck(
    page,
    "2026-08-17",
    "Delivery recovered, and the week closed with two durable gains."
  )
  await assertPreviewFits800x450(page)
  await assertCopyFits1280Capture(page)

  await page.getByRole("combobox", { name: "Page", exact: true }).click()
  await page
    .getByRole("option", { name: "交付回穩，本週收斂兩項可延續成果。" })
    .click()
  await assertPreviewFits800x450(page)
  await assertCopyFits1280Capture(page)

  await page.getByRole("combobox", { name: "Page", exact: true }).click()
  await page
    .getByRole("option", {
      name: "Delivery recovered，本週收斂 two durable gains.",
    })
    .click()
  await assertPreviewFits800x450(page)
  await assertCopyFits1280Capture(page)

  await openDeck(
    page,
    "2026-08-10",
    "Ship the candidate. The baseline is slower."
  )
  await assertPreviewFits800x450(page)
  await assertCopyFits1280Capture(page)
  await page.getByRole("combobox", { name: "Page", exact: true }).click()
  await page
    .getByRole("option", { name: "採用候選方案。基準較慢且較不穩。" })
    .click()
  await assertPreviewFits800x450(page)
  await assertCopyFits1280Capture(page)
  await page.getByRole("combobox", { name: "Page", exact: true }).click()
  await page
    .getByRole("option", { name: "Ship the candidate。基準較慢且較不穩。" })
    .click()
  await assertPreviewFits800x450(page)
  await assertCopyFits1280Capture(page)

  await openDeck(page, "2026-08-03", "Five-day reviews and a held reserve.")
  await assertPreviewFits800x450(page)
  await assertCopyFits1280Capture(page)
  await page.getByRole("combobox", { name: "Page", exact: true }).click()
  await page
    .getByRole("option", { name: "五日審查、少漏接、守住備援。" })
    .click()
  await assertPreviewFits800x450(page)
  await assertCopyFits1280Capture(page)
  await page.getByRole("combobox", { name: "Page", exact: true }).click()
  await page
    .getByRole("option", {
      name: "Five-day reviews，少漏接，and a held reserve.",
    })
    .click()
  await assertPreviewFits800x450(page)
  await assertCopyFits1280Capture(page)
})
