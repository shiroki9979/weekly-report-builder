import { expect, test, type Page } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"
import { readFile } from "node:fs/promises"
import { seedWeeksFromDemo } from "../../scripts/seed-weeks"
import { e2eWeeksDir } from "./weeks-reset"

const demoDir = path.resolve(import.meta.dirname, "../../demo")

test.beforeEach(() => {
  const weeksDir = e2eWeeksDir()
  fs.rmSync(weeksDir, { recursive: true, force: true })
  expect(seedWeeksFromDemo(demoDir, weeksDir)).toEqual({ status: "seeded" })
})

async function selectPage(page: Page, number: number) {
  await page.getByRole("button", { name: `Go to page ${number}` }).click()
}

async function fitsPreview(page: Page, width: number, height: number) {
  const frame = page.getByTestId("stage-frame")
  const result = await frame.evaluate(
    (element, size) => {
      const node = element as HTMLElement
      node.style.width = `${size.width}px`
      node.style.maxWidth = `${size.width}px`
      node.style.height = `${size.height}px`
      const bounds = node.getBoundingClientRect()
      const violations = [
        ...node.querySelectorAll("h1, h2, p, figcaption"),
      ].flatMap((child) => {
        const rect = child.getBoundingClientRect()
        const fits =
          rect.left >= bounds.left - 1 &&
          rect.right <= bounds.right + 1 &&
          rect.top >= bounds.top - 1 &&
          rect.bottom <= bounds.bottom + 1 &&
          child.scrollWidth <= child.clientWidth + 1 &&
          child.scrollHeight <= child.clientHeight + 2
        return fits
          ? []
          : [
              `${child.textContent?.slice(0, 80)} rect=${rect.left},${rect.top},${rect.right},${rect.bottom} frame=${bounds.left},${bounds.top},${bounds.right},${bounds.bottom} scroll=${child.scrollWidth}/${child.clientWidth},${child.scrollHeight}/${child.clientHeight}`,
            ]
      })
      return { width: bounds.width, height: bounds.height, violations }
    },
    { width, height }
  )
  expect(result).toEqual({ width, height, violations: [] })
}

// 同頁 Trend 文字的 clamp 下限；圖表若被剩餘高度等比壓縮，軸字會先低於此值
const MIN_TREND_TEXT_PX = 9
const TREND_DEMO_PAGES = new Set<number>([6, 7, 8])

async function expectReadableFullWidthChart(page: Page) {
  const chart = page
    .getByTestId("stage-frame")
    .locator(".editorial-trend-chart")
  const drawn = await chart.evaluate((figure) => {
    const svg = figure.querySelector("svg")!
    const box = svg.getBoundingClientRect()
    const viewBox = svg.viewBox.baseVal
    // 預設 preserveAspectRatio 為 meet，實際繪製比例取寬高兩者較小值
    const scale = Math.min(
      box.width / viewBox.width,
      box.height / viewBox.height
    )
    const axis = svg.querySelector(".editorial-trend-axis")!
    const summary = figure.parentElement!.querySelector(
      ".editorial-trend-summary"
    )!
    return {
      figureWidth: figure.getBoundingClientRect().width,
      plotWidth: viewBox.width * scale,
      axisFontPx: Number(axis.getAttribute("font-size")) * scale,
      // 圖表區塊（含圖例與日期範圍）須在摘要之上結束，不得互相覆蓋
      overlapPx:
        figure.lastElementChild!.getBoundingClientRect().bottom -
        summary.getBoundingClientRect().top,
    }
  })
  expect(drawn.plotWidth).toBeCloseTo(drawn.figureWidth, 0)
  expect(drawn.axisFontPx).toBeGreaterThanOrEqual(MIN_TREND_TEXT_PX)
  expect(drawn.overlapPx).toBeLessThanOrEqual(0)
}

// 預覽尺寸剛改變時，圖表要等 ResizeObserver 重算 viewBox 後才會回到全寬
async function expectChartSettledAtFullWidth(page: Page) {
  await expect(async () => expectReadableFullWidthChart(page)).toPass()
}

test("fresh public demo opens both directions and both Next Actions compositions", async ({
  page,
}) => {
  await page.context().grantPermissions(["clipboard-write", "clipboard-read"])
  await page.goto("/")
  await expect(page.getByRole("combobox", { name: "Week" })).toContainText(
    "2026-01-05"
  )
  for (const [number, required] of [
    [4, "Next Actions"],
    [6, "Exact: 8.04 s > 8 s"],
    [7, "Target met"],
    [8, "No data"],
    [9, "Action & intended outcome"],
    [10, "schema review"],
  ] as const) {
    await selectPage(page, number)
    const stage = page.getByTestId("stage-frame")
    await expect(stage.getByText(required, { exact: false })).toBeVisible()
    await fitsPreview(page, 800, 450)
    if (TREND_DEMO_PAGES.has(number)) await expectChartSettledAtFullWidth(page)
    await stage.screenshot({
      path: test.info().outputPath(`demo-p${number}-800.png`),
    })
    await fitsPreview(page, 1280, 720)
    if (TREND_DEMO_PAGES.has(number)) await expectChartSettledAtFullWidth(page)
    await page.getByRole("button", { name: "Copy to clipboard" }).click()
    await expect(
      page.getByRole("status").filter({ hasText: "Copied" })
    ).toBeVisible()
    const png = await page.evaluate(async () => {
      const item = (await navigator.clipboard.read())[0]
      const blob = await item.getType("image/png")
      const bytes = new Uint8Array(await blob.arrayBuffer())
      return Array.from(bytes)
    })
    const bytes = Buffer.from(png)
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a")
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([
      2560, 1440,
    ])
    fs.writeFileSync(
      test.info().outputPath(`demo-p${number}-capture.png`),
      bytes
    )
  }
  await selectPage(page, 8)
  await expect(
    page.getByTestId("stage-frame").getByText("Latest week · 2026-01-05")
  ).toBeVisible()
  await expect(
    page.getByTestId("stage-frame").locator("svg desc")
  ).toContainText("2026-01-05: No observation")
})

test("dated missing history survives next-week trim, append, save, reload, and PNG", async ({
  page,
}) => {
  const duplicateKeyWarnings: string[] = []
  page.on("console", (message) => {
    if (message.text().includes("children with the same key")) {
      duplicateKeyWarnings.push(message.text())
    }
  })
  await page.goto("/")
  await page.getByRole("button", { name: "Edit", exact: true }).click()
  await selectPage(page, 6)
  await expect(
    page.getByRole("button", { name: "Add later week" })
  ).toBeDisabled()
  await page.getByRole("button", { name: "Create week" }).click()
  await expect(page.getByRole("combobox", { name: "Week" })).toContainText(
    "2026-01-12"
  )
  expect(duplicateKeyWarnings).toEqual([])
  await page.getByRole("combobox", { name: "Page", exact: true }).click()
  await expect(
    page.getByRole("option", { name: "p06", exact: true })
  ).toBeVisible()
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Edit", exact: true }).click()
  await selectPage(page, 6)
  await expect(
    page.getByRole("textbox", { name: "Title", exact: true })
  ).toHaveValue("")
  await expect(
    page
      .getByTestId("stage-frame")
      .getByText("Observed weeks: 2025-10-20 – 2026-01-05")
  ).toBeVisible()
  await page.getByRole("button", { name: "Remove earliest week" }).click()
  await expect(
    page.getByRole("textbox", { name: /Week 1 · 2025-10-27/ })
  ).toHaveValue("10.3")
  await page.getByRole("button", { name: "Add later week" }).click()
  await page.getByRole("textbox", { name: /Week 12 · 2026-01-12/ }).fill("8.02")
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Fictional export time is still above target.")
  await page
    .getByRole("textbox", { name: "Interpretation" })
    .fill("The latest fictional sample remains 0.02 s above the ceiling.")
  const stage = page.getByTestId("stage-frame")
  await expect(
    stage.getByText("Observed weeks: 2025-10-27 – 2026-01-12")
  ).toBeVisible()
  await expect(stage.locator("svg desc")).toContainText(
    "2025-12-01: No observation"
  )
  await expect(stage.getByText("Target missed")).toBeVisible()
  await expect(stage.getByText("Exact: 8.02 s > 8 s")).toBeVisible()
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Saved", { exact: true })).toBeVisible()
  await page.reload()
  await selectPage(page, 6)
  await expect(stage.getByText("Exact: 8.02 s > 8 s")).toBeVisible()
  const download = page.waitForEvent("download", {
    predicate: (item) => item.suggestedFilename() === "2026-01-12-p06.png",
  })
  await page.getByRole("button", { name: "Download PNGs" }).click()
  const bytes = await readFile(await (await download).path())
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a")
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([2560, 1440])
  fs.writeFileSync(test.info().outputPath("next-week-p06.png"), bytes)
})

test("blocks a Trend page whose text leaves no room for the full-width chart", async ({
  page,
}) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Edit", exact: true }).click()
  await selectPage(page, 6)
  await page
    .getByRole("textbox", { name: "Interpretation" })
    .fill("The latest sample is still above the inclusive ceiling. ".repeat(12))

  await expectChartSettledAtFullWidth(page)
  await page.getByRole("button", { name: "Copy to clipboard" }).click()
  await expect(
    page
      .locator("p[role='alert']")
      .filter({ hasText: "Page overflows the 1280 × 720 capture stage" })
  ).toBeVisible()
})
