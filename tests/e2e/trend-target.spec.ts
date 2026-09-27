import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import { resetE2eWeeks } from "./weeks-reset"

test.beforeEach(() => resetE2eWeeks())

test("authors, saves, reloads, copies, and exports a measured Trend & Target page", async ({
  page,
}) => {
  await page.context().grantPermissions(["clipboard-write", "clipboard-read"])
  await page.goto("/")
  await page.getByRole("button", { name: "Edit", exact: true }).click()
  await page.getByRole("combobox", { name: "Add page" }).click()
  await page.getByRole("option", { name: "Trend & Target" }).click()
  await page.getByRole("button", { name: "Add page" }).click()
  await expect(page.getByRole("alert")).toContainText("Draft Page")
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Export time fell, but the target remains unmet.")
  await page
    .getByRole("textbox", { name: "Metric label" })
    .fill("Mean export duration")
  await page
    .getByRole("textbox", { name: "Starting Monday" })
    .fill("2026-07-13")
  for (const [index, value] of [
    "9.6",
    "9.1",
    "8.9",
    "8.7",
    "8.5",
    "8.3",
    "8.1",
    "8.04",
  ].entries()) {
    await page
      .getByRole("textbox", { name: new RegExp(`Week ${index + 1} ·`) })
      .fill(value)
  }
  await page.getByRole("textbox", { name: "Fixed target" }).fill("8")
  await page.getByRole("textbox", { name: "Unit", exact: true }).fill("s")
  await page
    .getByRole("textbox", { name: "Interpretation" })
    .fill("The latest week still needs work.")
  await page
    .getByRole("textbox", { name: "Measurement Context" })
    .fill("100 sample exports per Monday.")
  const stage = page.getByTestId("stage-frame")
  await expect(stage.getByText("Target missed")).toBeVisible()
  await expect(stage.getByText("Exact: 8.04 s > 8 s")).toBeVisible()
  await expect(
    stage.getByText("Observed weeks: 2026-07-13 – 2026-08-31")
  ).toBeVisible()
  const legend = await stage.locator(".editorial-trend-legend").boundingBox()
  const summary = await stage
    .getByRole("region", { name: "Latest week and target" })
    .boundingBox()
  expect(
    legend && summary && legend.y + legend.height <= summary.y
  ).toBeTruthy()
  await expect(page.getByRole("alert")).toHaveCount(0)

  await page.getByRole("textbox", { name: /Week 8 ·/ }).fill("oops")
  await expect(page.getByRole("alert")).toContainText(
    "Enter a finite signed number"
  )
  await page.getByRole("button", { name: "Save" }).click()
  await expect(
    page.getByText("Fix invalid Trend & Target input before saving")
  ).toBeVisible()
  await page.getByRole("button", { name: "Copy to clipboard" }).click()
  await expect(
    page
      .locator("p[role='alert']")
      .filter({ hasText: "Enter a finite signed number" })
  ).toBeVisible()
  await page.getByRole("textbox", { name: /Week 8 ·/ }).fill("8.04")
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Saved", { exact: true })).toBeVisible()

  await page.reload()
  await page.getByRole("combobox", { name: "Page", exact: true }).click()
  await page
    .getByRole("option", {
      name: "Export time fell, but the target remains unmet.",
    })
    .click()
  await expect(stage.getByText("Exact: 8.04 s > 8 s")).toBeVisible()
  await page.getByRole("button", { name: "Copy to clipboard" }).click()
  await expect(
    page.getByRole("status").filter({ hasText: "Copied" })
  ).toBeVisible()
  const download = page.waitForEvent("download", {
    predicate: (event) => event.suggestedFilename() === "2026-08-31-p03.png",
  })
  await page.getByRole("button", { name: "Download PNGs" }).click()
  const png = await download
  expect(png.suggestedFilename()).toBe("2026-08-31-p03.png")
  const bytes = await readFile(await png.path())
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a")
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([2560, 1440])
})

test("clones dated evidence, maintains the window, confirms re-dating, and exports the next week", async ({
  page,
}) => {
  await page.context().grantPermissions(["clipboard-write", "clipboard-read"])
  await page.goto("/")
  await page.getByRole("button", { name: "Edit", exact: true }).click()
  await page.getByRole("combobox", { name: "Add page" }).click()
  await page.getByRole("option", { name: "Trend & Target" }).click()
  await page.getByRole("button", { name: "Add page" }).click()
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Initial conclusion")
  await page
    .getByRole("textbox", { name: "Metric label" })
    .fill("Export duration")
  await page
    .getByRole("textbox", { name: "Starting Monday" })
    .fill("2026-07-13")
  for (const [index, value] of [
    "9",
    "8.9",
    "8.8",
    "8.7",
    "8.6",
    "8.5",
    "8.4",
    "8.3",
  ].entries())
    await page
      .getByRole("textbox", { name: new RegExp(`Week ${index + 1} ·`) })
      .fill(value)
  await page.getByRole("textbox", { name: "Fixed target" }).fill("8")
  await page
    .getByRole("textbox", { name: "Interpretation" })
    .fill("Initial interpretation")
  await page
    .getByRole("textbox", { name: "Measurement Context" })
    .fill("100 exports every Monday")

  await page
    .getByRole("textbox", { name: "Starting Monday" })
    .fill("2026-07-20")
  await expect(
    page.getByRole("group", { name: "Review date change" })
  ).toContainText("Current observed weeks: 2026-07-13 – 2026-08-31")
  await expect(
    page.getByRole("group", { name: "Review date change" })
  ).toContainText("Proposed observed weeks: 2026-07-20 – 2026-09-07")
  await page.getByRole("button", { name: "Cancel date change" }).click()
  await expect(
    page.getByRole("textbox", { name: "Starting Monday" })
  ).toHaveValue("2026-07-13")
  await page
    .getByRole("textbox", { name: "Starting Monday" })
    .fill("2026-07-20")
  await page.getByRole("button", { name: "Confirm new dates" }).click()
  await expect(
    page
      .getByTestId("stage-frame")
      .getByText("Observed weeks: 2026-07-20 – 2026-09-07")
  ).toBeVisible()
  await page
    .getByRole("textbox", { name: "Starting Monday" })
    .fill("2026-07-13")
  await page.getByRole("button", { name: "Confirm new dates" }).click()
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Saved", { exact: true })).toBeVisible()

  await page.getByRole("button", { name: "Create week" }).click()
  await expect(page.getByRole("combobox", { name: "Week" })).toContainText(
    "2026-09-07"
  )
  await page.getByRole("button", { name: "Edit", exact: true }).click()
  await page.getByRole("button", { name: "Go to page 2" }).click()
  await expect(
    page.getByRole("textbox", { name: "Title", exact: true })
  ).toHaveValue("")
  await expect(
    page.getByRole("textbox", { name: "Interpretation" })
  ).toHaveValue("")
  await expect(
    page.getByRole("textbox", { name: "Measurement Context" })
  ).toHaveValue("100 exports every Monday")
  await expect(
    page
      .getByTestId("stage-frame")
      .getByText("Observed weeks: 2026-07-13 – 2026-08-31")
  ).toBeVisible()
  await page.getByRole("button", { name: "Remove earliest week" }).click()
  await expect(
    page.getByRole("textbox", { name: /Week 1 · 2026-07-20/ })
  ).toHaveValue("8.9")
  await page.getByRole("button", { name: "Add later week" }).click()
  await page.getByRole("textbox", { name: /Week 8 · 2026-09-07/ }).fill("8.1")
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Export duration held near target")
  await page
    .getByRole("textbox", { name: "Interpretation" })
    .fill("The new week remained near target")
  await expect(
    page
      .getByTestId("stage-frame")
      .getByText("Observed weeks: 2026-07-20 – 2026-09-07")
  ).toBeVisible()
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Saved", { exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole("button", { name: "Go to page 2" }).click()
  await expect(
    page
      .getByTestId("stage-frame")
      .getByText("Observed weeks: 2026-07-20 – 2026-09-07")
  ).toBeVisible()
  await page.getByRole("button", { name: "Copy to clipboard" }).click()
  await expect(
    page.getByRole("status").filter({ hasText: "Copied" })
  ).toBeVisible()
  const download = page.waitForEvent("download", {
    predicate: (event) => event.suggestedFilename() === "2026-09-07-p03.png",
  })
  await page.getByRole("button", { name: "Download PNGs" }).click()
  const png = await download
  const bytes = await readFile(await png.path())
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a")
})
