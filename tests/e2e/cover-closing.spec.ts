import { expect, test } from "@playwright/test"
import { readFileSync } from "node:fs"
import path from "node:path"
import { resetE2eDecks } from "./decks-reset"
import { fitAtCaptureSize, copyPng } from "./stage-capture"

const copy = {
  en: {
    title: "Harbor pilot findings",
    subtitle:
      "A fictional review of forecast quality, operating limits, and the next measurement window.",
    byline: "Harbor Forecast team",
    conclusion:
      "Continue the pilot and verify the remaining operating assumptions.",
    point:
      "Keep the shared forecast board and compare the next observation window before expanding the pilot.",
    line: "Contact harbor@example.test to coordinate the next review.",
    boundary:
      "Fictional pilot sample; results apply only to the observed sites.",
  },
  zh: {
    title: "港灣試行計畫觀測成果",
    subtitle:
      "以虛構資料檢視預測品質、操作限制與下一個量測期間，作為試行計畫的階段紀錄。",
    byline: "港灣預測研究小組",
    conclusion: "延續試行計畫，並驗證尚待確認的操作假設。",
    point:
      "保留共用預測看板，先比較下一個觀測期間的結果，再決定是否擴大試行範圍。",
    line: "下一步：與研究小組確認量測期間與驗證方式。",
    boundary: "僅使用虛構試行樣本，結論限於已觀測站點。",
  },
  mixed: {
    title: "Harbor pilot：港灣觀測成果",
    subtitle:
      "Forecast quality 預測品質、operating limits 操作限制與下一個 measurement window。",
    byline: "Harbor Forecast 研究小組",
    conclusion: "Continue the pilot，並驗證剩餘操作假設。",
    point:
      "Keep the shared forecast board，先比較下一個 observation window 再擴大試行範圍。",
    line: "Next review：請聯絡 harbor@example.test 協調量測期間。",
    boundary: "Fictional sample 虛構樣本；僅適用於已觀測站點。",
  },
} as const

test.beforeEach(() => resetE2eDecks())

for (const theme of ["default", "observatory"] as const) {
  for (const language of ["en", "zh", "mixed"] as const) {
    test(`${theme} Cover and Closing fit and export minimum and maximum ${language} content`, async ({
      page,
      request,
    }) => {
      test.slow()
      const content = copy[language]
      const pages = [
        {
          id: "cover-min",
          layout: "cover",
          title: content.title,
          showPageNumber: true,
        },
        {
          id: "cover-max",
          layout: "cover",
          title: content.title,
          subtitle: content.subtitle,
          byline: content.byline,
        },
        {
          id: "closing-min",
          layout: "closing",
          title: content.conclusion,
          takeaways: [],
          boundary: "",
        },
        {
          id: "closing-max",
          layout: "closing",
          title: content.conclusion,
          eyebrow: "Next review",
          takeaways: Array.from({ length: 4 }, (_, index) => ({
            ref: `0${index + 1}`,
            text: content.point,
          })),
          closingLine: content.line,
          boundary: content.boundary,
        },
      ]
      const saved = await request.put("/api/decks/bookends", {
        data: {
          theme,
          title: "Harbor Forecast",
          period: { start: "2026-11-02", end: "2026-11-06" },
          pages,
        },
      })
      expect(saved.ok()).toBe(true)
      await page
        .context()
        .grantPermissions(["clipboard-read", "clipboard-write"])
      for (const [index, entry] of pages.entries()) {
        await page.goto(`/?deck=bookends&page=${index + 1}`)
        const stage = page.getByTestId("stage-frame")
        await expect(
          stage.getByRole("heading", { name: entry.title, exact: true })
        ).toBeVisible()
        await fitAtCaptureSize(page)
        if (entry.layout === "cover") {
          await expect(
            stage.getByText("2026-11-02 — 2026-11-06", { exact: true })
          ).toBeVisible()
          await expect(
            stage.getByText(`${index + 1} / 4`, { exact: true })
          ).toHaveCount(0)
          await expect(
            stage.getByText(`0${index + 1} / 04`, { exact: true })
          ).toHaveCount(0)
        } else {
          const label =
            theme === "default" ? `${index + 1} / 4` : `0${index + 1} / 04`
          await expect(stage.getByText(label, { exact: true })).toBeVisible()
        }
        if (index === 2) await expect(stage.getByText(/Closing$/)).toBeVisible()
        if (index === 3) {
          const lastPoint = await stage
            .getByText(content.point, { exact: true })
            .last()
            .boundingBox()
          const line = await stage
            .getByText(content.line, { exact: true })
            .boundingBox()
          const boundary = await stage
            .getByText(content.boundary, { exact: true })
            .boundingBox()
          expect(lastPoint).not.toBeNull()
          expect(line).not.toBeNull()
          expect(boundary).not.toBeNull()
          expect(line!.y).toBeGreaterThanOrEqual(
            lastPoint!.y + lastPoint!.height
          )
          expect(line!.y - lastPoint!.y - lastPoint!.height).toBeLessThan(70)
          expect(boundary!.y).toBeGreaterThanOrEqual(line!.y + line!.height)
        }
        await copyPng(page, `${theme}-${language}-${entry.id}.png`)
      }
    })
  }

  test(`${theme} overflowing Cover is blocked from Copy`, async ({
    page,
    request,
  }) => {
    const title =
      "Fictional Harbor pilot findings require another observation window. ".repeat(
        30
      )
    expect(
      (
        await request.put("/api/decks/cover-limit", {
          data: {
            theme,
            pages: [
              {
                id: "cover",
                layout: "cover",
                title,
                subtitle: "Split the report into more pages.",
              },
            ],
          },
        })
      ).ok()
    ).toBe(true)
    await page.goto("/?deck=cover-limit")
    await expect(
      page
        .getByTestId("stage-frame")
        .getByRole("heading", { name: title.trim(), exact: true })
    ).toBeVisible()
    await page.getByRole("button", { name: "Copy to clipboard" }).click()
    await expect(
      page
        .locator("p[role='alert']")
        .filter({ hasText: "Page overflows the 1280 × 720 capture stage" })
    ).toBeVisible()
  })

  test(`${theme} Boundary Note blocks overlapping content in Copy and batch`, async ({
    page,
    request,
  }) => {
    const point =
      "Keep the shared forecast board and compare the next observation window before expanding the fictional pilot to additional sites and operating conditions."
    const boundary =
      "The fictional pilot covers only three sites and a short observation window. ".repeat(
        22
      )
    expect(
      (
        await request.put("/api/decks/boundary-limit", {
          data: {
            theme,
            pages: [
              { id: "cover", layout: "cover", title: "A complete cover" },
              {
                id: "closing",
                layout: "closing",
                title:
                  "Continue the pilot and verify the remaining operating assumptions.",
                takeaways: Array.from({ length: 4 }, () => ({ text: point })),
                closingLine: "Contact the team for the next review.",
                boundary,
              },
            ],
          },
        })
      ).ok()
    ).toBe(true)
    await page.goto("/?deck=boundary-limit&page=2")
    await expect(
      page
        .getByTestId("stage-frame")
        .getByText(boundary.trim(), { exact: true })
    ).toBeVisible()
    const stage = page.getByTestId("stage-frame")
    await stage.evaluate(async (root) => {
      root.style.width = "1280px"
      root.style.maxWidth = "1280px"
      root.style.height = "720px"
      await document.fonts.ready
    })
    const note = await stage
      .getByText(boundary.trim(), { exact: true })
      .boundingBox()
    const closingLine = await stage
      .getByText("Contact the team for the next review.", { exact: true })
      .boundingBox()
    expect(note).not.toBeNull()
    expect(closingLine).not.toBeNull()
    expect(note!.height).toBeLessThan(360)
    expect(closingLine!.y + closingLine!.height).toBeLessThanOrEqual(note!.y)
    await page.getByRole("button", { name: "Copy to clipboard" }).click()
    await expect(
      page
        .locator("p[role='alert']")
        .filter({ hasText: "Page overflows the 1280 × 720 capture stage" })
    ).toBeVisible()
    await page.getByRole("button", { name: "Download PNGs" }).click()
    const skipped = page
      .getByRole("status")
      .filter({ hasText: "Skipped pages" })
    await expect(skipped).toContainText("closing: Page overflows")
    await expect(skipped).not.toContainText("cover:")
  })
  test(`${theme} Overview Boundary Note cannot overlap existing outcomes`, async ({
    page,
    request,
  }) => {
    const demo = JSON.parse(
      readFileSync(
        path.resolve(import.meta.dirname, "../../demo/2026-01-05.json"),
        "utf8"
      )
    )
    const boundary =
      "The fictional pilot covers only three sites and a short observation window. ".repeat(
        30
      )
    expect(
      (
        await request.put("/api/decks/overview-boundary", {
          data: {
            theme,
            pages: [{ ...demo.pages[1], id: "overview", boundary }],
          },
        })
      ).ok()
    ).toBe(true)
    await page.goto("/?deck=overview-boundary")
    const stage = page.getByTestId("stage-frame")
    await expect(
      stage.getByText(boundary.trim(), { exact: true })
    ).toBeVisible()
    await stage.evaluate(async (root) => {
      root.style.width = "1280px"
      root.style.maxWidth = "1280px"
      root.style.height = "720px"
      await document.fonts.ready
    })
    await page.getByRole("button", { name: "Copy to clipboard" }).click()
    await expect(
      page
        .locator("p[role='alert']")
        .filter({ hasText: "Page overflows the 1280 × 720 capture stage" })
    ).toBeVisible()
    await page.getByRole("button", { name: "Download PNGs" }).click()
    await expect(
      page.getByRole("status").filter({ hasText: "Skipped pages" })
    ).toContainText("overview: Page overflows")
  })
}

test("authors, reloads, and reuses Cover and Closing through the Weekly Series", async ({
  page,
  request,
}) => {
  expect(
    (
      await request.put("/api/decks/2026-11-02", {
        data: {
          theme: "observatory",
          title: "Harbor Forecast",
          period: { start: "2026-11-02", end: "2026-11-06" },
          pages: [{ id: "p01", layout: "cover", title: "Existing cover" }],
        },
      })
    ).ok()
  ).toBe(true)
  await page.goto("/?deck=2026-11-02")
  await page.getByRole("button", { name: "Edit", exact: true }).click()
  await page.getByRole("combobox", { name: "Add page", exact: true }).click()
  await page.getByRole("option", { name: "Cover", exact: true }).click()
  await page.getByRole("button", { name: "Add page", exact: true }).click()
  await expect(
    page.getByRole("alert").filter({ hasText: "Draft Page" })
  ).toBeVisible()
  await expect(
    page.getByRole("textbox", { name: "Boundary Note", exact: true })
  ).toHaveCount(0)
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("New pilot cover")
  await page
    .getByRole("textbox", { name: "Subtitle", exact: true })
    .fill("Fictional weekly review")
  await page
    .getByRole("textbox", { name: "Byline", exact: true })
    .fill("Harbor team")
  await page.getByRole("combobox", { name: "Add page", exact: true }).click()
  await page.getByRole("option", { name: "Closing", exact: true }).click()
  await page.getByRole("button", { name: "Add page", exact: true }).click()
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Continue the pilot")
  await page
    .getByRole("textbox", { name: "Eyebrow", exact: true })
    .fill("Next review")
  await page.getByRole("button", { name: "Add takeaway", exact: true }).click()
  await page
    .getByRole("textbox", { name: "Takeaway text", exact: true })
    .fill("Measure the next window")
  await page.getByRole("textbox", { name: "Reference", exact: true }).fill("02")
  await page
    .getByRole("textbox", { name: "Closing line", exact: true })
    .fill("harbor@example.test")
  await page
    .getByRole("textbox", { name: "Boundary Note", exact: true })
    .fill("Fictional pilot only")
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await expect(page.getByText("Saved", { exact: true })).toBeVisible()
  await page.reload()
  const stage = page.getByTestId("stage-frame")
  await expect(
    stage.getByRole("heading", { name: "Continue the pilot", exact: true })
  ).toBeVisible()
  await expect(
    stage.getByText("Fictional pilot only", { exact: true })
  ).toBeVisible()
  const saved = await (await request.get("/decks/2026-11-02.json")).json()
  expect(saved.pages[1]).toMatchObject({
    layout: "cover",
    title: "New pilot cover",
    subtitle: "Fictional weekly review",
    byline: "Harbor team",
  })
  expect(saved.pages[2]).toMatchObject({
    layout: "closing",
    eyebrow: "Next review",
    takeaways: [{ ref: "02", text: "Measure the next window" }],
    closingLine: "harbor@example.test",
    boundary: "Fictional pilot only",
  })
  await page.getByRole("button", { name: "Edit", exact: true }).click()
  await page.getByRole("button", { name: "Create week", exact: true }).click()
  await expect(
    page.getByRole("combobox", { name: "Deck", exact: true })
  ).toContainText("2026-11-09")
  const reused = await (await request.get("/decks/2026-11-09.json")).json()
  expect(reused).toMatchObject({
    theme: "observatory",
    title: "Harbor Forecast",
  })
  expect(reused.pages[1]).toMatchObject({
    layout: "cover",
    title: "",
    subtitle: "",
    byline: "Harbor team",
  })
  expect(reused.pages[2]).toMatchObject({
    layout: "closing",
    title: "",
    eyebrow: "",
    takeaways: [],
    closingLine: "harbor@example.test",
  })
  expect(reused.pages[2]).not.toHaveProperty("boundary")
})
