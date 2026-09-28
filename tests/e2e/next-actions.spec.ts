import { expect, test, type Page } from "@playwright/test"
import fs from "node:fs"

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
  await expect(
    page.getByRole("combobox", { name: "Composition" })
  ).toContainText("Rows")
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

test("switches legacy Columns to Rows, saves, and carries the choice into a new week", async ({
  page,
}) => {
  await openActionsWeek(page)
  await unlockEditor(page)
  const composition = page.getByRole("combobox", { name: "Composition" })
  await expect(composition).toContainText("Columns")
  await composition.click()
  await page.getByRole("option", { name: "Rows" }).click()
  await expect(
    page.getByTestId("stage-frame").getByText("Action & intended outcome")
  ).toBeVisible()
  await expect(
    page
      .getByTestId("stage-frame")
      .getByText("Median wait ≤ 5 days next Friday.")
  ).toBeVisible()
  await expect(
    page.getByRole("textbox", { name: "Commitment title" }).first()
  ).toHaveValue("Stabilize the review queue")

  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Saved", { exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole("combobox", { name: "Week" }).click()
  await page.getByRole("option", { name: "2026-08-03" }).click()
  await unlockEditor(page)
  await expect(
    page.getByRole("combobox", { name: "Composition" })
  ).toContainText("Rows")
  await page.getByRole("combobox", { name: "Week" }).click()
  await page.getByRole("option", { name: "2026-08-31" }).click()
  await unlockEditor(page)
  await page.getByRole("combobox", { name: "Add page" }).click()
  await page.getByRole("option", { name: "Next Actions" }).click()
  await page.getByRole("button", { name: "Add page" }).click()
  await expect(
    page.getByRole("combobox", { name: "Composition" })
  ).toContainText("Rows")
  await page
    .getByRole("textbox", { name: "Commitment title" })
    .first()
    .fill("Start next week")
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Saved", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Create week" }).click()
  await expect(page.getByRole("combobox", { name: "Week" })).toContainText(
    "2026-09-07"
  )
  await unlockEditor(page)
  await page.getByRole("button", { name: "Go to page 2" }).click()
  await expect(
    page.getByRole("combobox", { name: "Composition" })
  ).toContainText("Rows")
  await expect(
    page.getByRole("textbox", { name: "Commitment title" }).first()
  ).toHaveValue("")
})

async function assertActionsFitAtPreviewAndCapture(page: Page) {
  const frame = page.getByTestId("stage-frame")
  const box = await frame.evaluate((element) => {
    const node = element as HTMLElement
    node.style.width = "800px"
    node.style.maxWidth = "800px"
    node.style.height = "450px"
    return {
      width: node.getBoundingClientRect().width,
      height: node.getBoundingClientRect().height,
      scrollWidth: node.scrollWidth,
      scrollHeight: node.scrollHeight,
    }
  })
  expect(box).toEqual({
    width: 800,
    height: 450,
    scrollWidth: 800,
    scrollHeight: 450,
  })
  const visibleTextFits = await frame.evaluate((element) => {
    const frameBox = element.getBoundingClientRect()
    return [...element.querySelectorAll("h1, h2, p")].every((node) => {
      const box = node.getBoundingClientRect()
      return (
        box.left >= frameBox.left - 1 &&
        box.right <= frameBox.right + 1 &&
        box.top >= frameBox.top - 1 &&
        box.bottom <= frameBox.bottom + 1 &&
        node.scrollWidth <= node.clientWidth + 1 &&
        node.scrollHeight <= node.clientHeight + 1
      )
    })
  })
  expect(visibleTextFits).toBe(true)
  await expectCopiedAtCaptureSize(page)
}

// 先清空剪貼簿，才能確認這次 Copy 真的通過 1280 × 720 的 Export gate，而非沿用上一輪的結果
async function expectCopiedAtCaptureSize(page: Page) {
  await page.evaluate(() => navigator.clipboard.writeText(""))
  await page.getByRole("button", { name: "Copy to clipboard" }).click()
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const [item] = await navigator.clipboard.read()
        if (!item?.types.includes("image/png")) return null
        const blob = await item.getType("image/png")
        const header = new DataView(await blob.slice(16, 24).arrayBuffer())
        return [header.getUint32(0), header.getUint32(4)]
      })
    )
    .toEqual([2560, 1440])
  await expect(
    page.locator("p[role='alert']").filter({ hasText: "Page overflows" })
  ).toHaveCount(0)
}

test("compares two to four multilingual Columns and Rows at preview and capture sizes", async ({
  page,
}) => {
  await page.context().grantPermissions(["clipboard-write", "clipboard-read"])
  await openActionsWeek(page)
  await unlockEditor(page)
  for (const title of [
    "Five-day reviews and a held reserve.",
    "五日審查、少漏接、守住備援。",
    "Five-day reviews，少漏接，and a held reserve.",
  ]) {
    if (title !== "Five-day reviews and a held reserve.") {
      await page.getByRole("combobox", { name: "Page", exact: true }).click()
      await page.getByRole("option", { name: title }).click()
    }
    const composition = page.getByRole("combobox", { name: "Composition" })
    await expect(composition).toContainText("Columns")
    await assertActionsFitAtPreviewAndCapture(page)
    await composition.click()
    await page.getByRole("option", { name: "Rows" }).click()
    const frame = page.getByTestId("stage-frame")
    await expect(frame.getByText("Verification checkpoint")).toBeVisible()
    await assertActionsFitAtPreviewAndCapture(page)
  }
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "Download PNGs" }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe("2026-08-03-p01.png")
  const pngPath = await download.path()
  expect(pngPath).toBeTruthy()
  expect(fs.readFileSync(pngPath!).subarray(0, 8).toString("hex")).toBe(
    "89504e470d0a1a0a"
  )
})

test("skips an overflowing next-actions page during batch export", async ({
  page,
}) => {
  await openActionsWeek(page)
  await unlockEditor(page)
  await page.getByRole("combobox", { name: "Page", exact: true }).click()
  await page.getByRole("option", { name: "Overflow actions" }).click()
  await page.getByRole("combobox", { name: "Composition" }).click()
  await page.getByRole("option", { name: "Rows" }).click()
  await page.getByRole("button", { name: "Copy to clipboard" }).click()
  await expect(
    page
      .locator("p[role='alert']")
      .filter({ hasText: "Page overflows the 1280 × 720 capture stage" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Download PNGs" }).click()
  const skipped = page.getByRole("status").filter({ hasText: "Skipped pages" })
  await expect(skipped).toContainText(
    "p04: Page overflows the 1280 × 720 capture stage"
  )
  await expect(skipped).not.toContainText("p01:")
  await expect(skipped).not.toContainText("p02:")
  await expect(skipped).not.toContainText("p03:")
})
