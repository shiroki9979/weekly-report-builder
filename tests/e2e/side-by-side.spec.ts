import { expect, test } from "@playwright/test"
import { resetE2eDecks } from "./decks-reset"
import { fitAtCaptureSize, copyPng } from "./stage-capture"

test.beforeEach(() => resetE2eDecks())

const copy = {
  en: {
    title: "Cache rendered pages and keep a fallback",
    labels: ["Cached renders", "Per-page capture"],
    points: [
      "Reuses unchanged pages across runs.",
      "Keeps every export independent.",
    ],
    why: "Reviewers repeatedly export the same fictional deck during a review.",
    cost: "Each layout now needs an invalidation rule.",
    boundary: "Fictional ten-page sample; large images remain unverified.",
  },
  zh: {
    title: "快取已繪製頁面，並保留逐頁擷取作為備援方案",
    labels: ["快取已繪製頁面", "逐頁擷取"],
    points: [
      "重用未變更頁面，縮短下一次匯出時間。",
      "每次匯出獨立執行，不維護快取狀態。",
    ],
    why: "審查者在檢視期間會重複匯出同一份虛構簡報。",
    cost: "每個版型現在都需要明確的快取失效規則。",
    boundary: "僅使用十頁虛構樣本；大型圖片仍待驗證。",
  },
  mixed: {
    title: "Cache rendered pages，並保留逐頁擷取作為備援",
    labels: ["Cached renders 快取頁面", "Per-page capture 逐頁擷取"],
    points: [
      "Reuse unchanged pages，縮短匯出時間。",
      "Independent exports，不維護快取狀態。",
    ],
    why: "Reviewers 在檢視期間會重複匯出同一份 fictional deck。",
    cost: "Each layout 都需要明確的 invalidation rule。",
    boundary: "Fictional ten-page sample；大型圖片仍待驗證。",
  },
} as const

for (const theme of ["default", "observatory"] as const) {
  for (const language of ["en", "zh", "mixed"] as const) {
    test(`${theme} Comparison fits and exports minimum and maximum ${language} content`, async ({
      page,
      request,
    }) => {
      test.slow()
      const content = copy[language]
      const pages = [1, 4].map((count) => ({
        id: `compare-${count}`,
        layout: "side-by-side",
        title: content.title,
        columns: content.labels.map((label, index) => ({
          label,
          points: Array.from({ length: count }, () => content.points[index]),
        })),
        ...(count === 4
          ? {
              chosen: 0,
              tradeoff: { why: content.why, cost: content.cost },
              boundary: content.boundary,
            }
          : {}),
      }))
      const saved = await request.put("/api/decks/comparison", {
        data: { theme, title: "Harbor Forecast", pages },
      })
      expect(saved.ok()).toBe(true)
      await page
        .context()
        .grantPermissions(["clipboard-read", "clipboard-write"])
      for (const [index, entry] of pages.entries()) {
        await page.goto(`/?deck=comparison&page=${index + 1}`)
        const stage = page.getByTestId("stage-frame")
        await expect(
          stage.getByRole("heading", { name: content.title, exact: true })
        ).toBeVisible()
        await fitAtCaptureSize(page)
        const left = stage.getByRole("region", {
          name: content.labels[0],
          exact: true,
        })
        const right = stage.getByRole("region", {
          name: content.labels[1],
          exact: true,
        })
        const firstBox = await left.boundingBox()
        const secondBox = await right.boundingBox()
        expect(firstBox).not.toBeNull()
        expect(secondBox).not.toBeNull()
        expect(firstBox!.width).toBeCloseTo(secondBox!.width, 0)
        expect(firstBox!.x + firstBox!.width).toBeLessThan(secondBox!.x)
        await expect(left.getByRole("listitem")).toHaveCount(
          index === 0 ? 1 : 4
        )
        await expect(right.getByRole("listitem")).toHaveCount(
          index === 0 ? 1 : 4
        )
        const pointNumber = left
          .getByRole("listitem")
          .first()
          .getByText("01", { exact: true })
        if (theme === "observatory") await expect(pointNumber).toBeVisible()
        else await expect(pointNumber).toBeHidden()
        const divider = await left.evaluate(
          (element) =>
            getComputedStyle(element.parentElement!, "::after").borderLeftWidth
        )
        expect(Number.parseFloat(divider)).toBeGreaterThanOrEqual(1)
        if (index === 0) {
          await expect(stage.getByText("Chosen", { exact: true })).toHaveCount(
            0
          )
          await expect(stage.getByText("Why", { exact: true })).toHaveCount(0)
        } else {
          await expect(left.getByText("Chosen", { exact: true })).toBeVisible()
          await expect(right.getByText("Chosen", { exact: true })).toHaveCount(
            0
          )
          const rules = await Promise.all(
            [left, right].map((column) =>
              column.evaluate((element) =>
                Number.parseFloat(getComputedStyle(element).borderTopWidth)
              )
            )
          )
          expect(rules[0]).toBeGreaterThan(rules[1])
          await expect(stage.getByText("Why", { exact: true })).toBeVisible()
          await expect(stage.getByText("Cost", { exact: true })).toBeVisible()
          await expect(
            stage.getByText(content.boundary, { exact: true })
          ).toBeVisible()
          const cost = await stage
            .getByText(content.cost, { exact: true })
            .boundingBox()
          const note = await stage
            .getByText(content.boundary, { exact: true })
            .boundingBox()
          expect(cost!.y + cost!.height).toBeLessThanOrEqual(note!.y)
        }
        await copyPng(page, `${theme}-${language}-${entry.id}.png`)
      }
    })
  }
}

for (const theme of ["default", "observatory"] as const) {
  test(`${theme} overflowing Comparison blocks Copy and is skipped by batch`, async ({
    page,
    request,
  }) => {
    const point =
      "Review the fictional pilot assumptions, record each result, and verify every operating condition before extending the trial. ".repeat(
        10
      )
    const saved = await request.put("/api/decks/comparison-limit", {
      data: {
        theme,
        pages: [
          { id: "cover", layout: "cover", title: "Harbor pilot" },
          {
            id: "comparison",
            layout: "side-by-side",
            title: "Review the pilot assumptions",
            columns: [
              { label: "Cached renders", points: [point] },
              { label: "Per-page capture", points: ["No cache state"] },
            ],
            chosen: 0,
            tradeoff: { why: "Repeated exports", cost: "Cache invalidation" },
            boundary: "Fictional sample only",
          },
        ],
      },
    })
    expect(saved.ok()).toBe(true)
    await page.goto("/?deck=comparison-limit&page=2")
    await expect(
      page.getByTestId("stage-frame").getByRole("heading", {
        name: "Review the pilot assumptions",
        exact: true,
      })
    ).toBeVisible()
    await page.getByRole("button", { name: "Copy to clipboard" }).click()
    await expect(
      page
        .locator("p[role='alert']")
        .filter({ hasText: "Page overflows the 1280 × 720 capture stage" })
    ).toBeVisible()
    const download = page.waitForEvent("download")
    await page.getByRole("button", { name: "Download PNGs" }).click()
    expect((await download).suggestedFilename()).toContain("cover")
    const skipped = page
      .getByRole("status")
      .filter({ hasText: "Skipped pages" })
    await expect(skipped).toContainText("comparison: Page overflows")
    await expect(skipped).not.toContainText("cover:")
  })
}

test("authors, reloads and reuses a chosen Comparison with a Tradeoff Callout", async ({
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
          pages: [{ id: "p01", layout: "cover", title: "Harbor pilot" }],
        },
      })
    ).ok()
  ).toBe(true)
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"])
  await page.goto("/?deck=2026-11-02")
  await page.getByRole("button", { name: "Edit", exact: true }).click()
  await page.getByRole("combobox", { name: "Add page", exact: true }).click()
  await page
    .getByRole("option", { name: "Side-by-side Comparison", exact: true })
    .click()
  await page.getByRole("button", { name: "Add page", exact: true }).click()
  await expect(
    page.getByRole("alert").filter({ hasText: "Draft Page" })
  ).toBeVisible()
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Cache rendered pages and keep a fallback")
  const left = page.getByRole("group", { name: "Column 1", exact: true })
  const right = page.getByRole("group", { name: "Column 2", exact: true })
  await left
    .getByRole("textbox", { name: "Column label", exact: true })
    .fill("Cached renders")
  await left
    .getByRole("textbox", { name: "Point 1", exact: true })
    .fill("Reuse unchanged pages")
  await left.getByRole("button", { name: "Add point", exact: true }).click()
  await left
    .getByRole("textbox", { name: "Point 2", exact: true })
    .fill("Shorter repeat export")
  await left.getByRole("button", { name: "Add point", exact: true }).click()
  await left
    .getByRole("textbox", { name: "Point 3", exact: true })
    .fill("Discarded test point")
  await left
    .getByRole("group", { name: "Point 3", exact: true })
    .getByRole("button", { name: "Remove", exact: true })
    .click()
  await left
    .getByRole("group", { name: "Point 2", exact: true })
    .getByRole("button", { name: "Move up", exact: true })
    .click()
  await expect(
    left.getByRole("textbox", { name: "Point 1", exact: true })
  ).toHaveValue("Shorter repeat export")
  await right
    .getByRole("textbox", { name: "Column label", exact: true })
    .fill("Per-page capture")
  await right
    .getByRole("textbox", { name: "Point 1", exact: true })
    .fill("No cache state")
  await right.getByRole("checkbox", { name: "Chosen", exact: true }).check()
  await left.getByRole("checkbox", { name: "Chosen", exact: true }).check()
  await expect(
    right.getByRole("checkbox", { name: "Chosen", exact: true })
  ).not.toBeChecked()
  await page
    .getByRole("checkbox", { name: "Include tradeoff", exact: true })
    .check()
  await expect(
    page.getByRole("textbox", { name: "Why", exact: true })
  ).toHaveAttribute("aria-invalid", "true")
  await page
    .getByRole("textbox", { name: "Why", exact: true })
    .fill("Reviewers repeat exports")
  await page
    .getByRole("textbox", { name: "Boundary Note", exact: true })
    .fill("Fictional pilot only")
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await expect(page.getByText("Saved", { exact: true })).toBeVisible()
  await page.reload()
  const stage = page.getByTestId("stage-frame")
  await expect(
    stage.getByRole("heading", {
      name: "Cache rendered pages and keep a fallback",
      exact: true,
    })
  ).toBeVisible()
  await expect(
    stage
      .getByRole("region", { name: "Cached renders", exact: true })
      .getByText("Chosen", { exact: true })
  ).toBeVisible()
  await expect(
    stage.getByText("Reviewers repeat exports", { exact: true })
  ).toBeVisible()
  await expect(stage.getByText("Cost", { exact: true })).toHaveCount(0)
  await copyPng(page, "authored-comparison.png")
  const saved = await (await request.get("/decks/2026-11-02.json")).json()
  expect(saved.pages[1]).toMatchObject({
    layout: "side-by-side",
    chosen: 0,
    columns: [
      {
        label: "Cached renders",
        points: ["Shorter repeat export", "Reuse unchanged pages"],
      },
      { label: "Per-page capture", points: ["No cache state"] },
    ],
    tradeoff: { why: "Reviewers repeat exports" },
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
    layout: "side-by-side",
    title: "",
    columns: [
      { label: "", points: ["", ""] },
      { label: "", points: [""] },
    ],
  })
  expect(reused.pages[1]).not.toHaveProperty("chosen")
  expect(reused.pages[1]).not.toHaveProperty("tradeoff")
  expect(reused.pages[1]).not.toHaveProperty("boundary")
})
