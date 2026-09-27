import { expect, test } from "@playwright/test"
import { readFile, writeFile } from "node:fs/promises"
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

test("authors explicit missing weeks, retains a measured zero, and exports a gap", async ({
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
    .fill("Export time data has gaps.")
  await page
    .getByRole("textbox", { name: "Metric label" })
    .fill("Mean export duration")
  await page
    .getByRole("textbox", { name: "Starting Monday" })
    .fill("2026-07-13")
  await page.getByRole("textbox", { name: /Week 1 ·/ }).fill("0")
  await page.getByRole("textbox", { name: /Week 3 ·/ }).fill("8")
  await page.getByRole("textbox", { name: /Week 2 ·/ }).fill("bad")
  await expect(page.getByRole("alert")).toContainText(
    "Enter a finite signed number"
  )
  await page
    .getByRole("button", { name: /No observation for Week 2 ·/ })
    .click()
  await expect(page.getByRole("alert")).toContainText("Observation is unfilled")
  for (const index of [4, 5, 6, 7, 8]) {
    await page
      .getByRole("button", {
        name: new RegExp(`No observation for Week ${index} ·`),
      })
      .click()
  }
  await page.getByRole("button", { name: /Enter value for Week 4 ·/ }).click()
  await expect(page.getByRole("textbox", { name: /Week 4 ·/ })).toHaveValue("")
  await page
    .getByRole("button", { name: /No observation for Week 4 ·/ })
    .click()
  await page.getByRole("textbox", { name: "Fixed target" }).fill("8")
  await page.getByRole("textbox", { name: "Unit", exact: true }).fill("s")
  await page
    .getByRole("textbox", { name: "Interpretation" })
    .fill("No reading was collected this week.")
  await page
    .getByRole("textbox", { name: "Measurement Context" })
    .fill("100 sample exports per Monday.")
  const stage = page.getByTestId("stage-frame")
  await expect(stage.getByText("No data")).toBeVisible()
  await expect(stage.getByText("× No observation")).toBeVisible()
  await expect(
    stage.getByText("Measurement Context: 100 sample exports per Monday.")
  ).toBeVisible()
  await expect(page.getByRole("alert")).toHaveCount(0)
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Saved", { exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole("combobox", { name: "Page", exact: true }).click()
  await page.getByRole("option", { name: "Export time data has gaps." }).click()
  await expect(stage.getByText("No data")).toBeVisible()
  await expect(stage.getByText("× No observation")).toBeVisible()
  await expect(stage.locator("svg desc")).toContainText("2026-07-13: 0.0 s")
  await expect(stage.locator("svg desc")).toContainText(
    "2026-08-31: No observation"
  )
  await page.getByRole("button", { name: "Copy to clipboard" }).click()
  await expect(
    page.getByRole("status").filter({ hasText: "Copied" })
  ).toBeVisible()
  const download = page.waitForEvent("download", {
    predicate: (event) => event.suggestedFilename() === "2026-08-31-p03.png",
  })
  await page.getByRole("button", { name: "Download PNGs" }).click()
  const png = await download
  const bytes = await readFile(await png.path())
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a")
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([2560, 1440])
  await writeFile("/tmp/wrb-42-45-missing.png", bytes)
})
