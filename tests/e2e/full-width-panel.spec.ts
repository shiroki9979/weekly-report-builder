import { expect, test } from "@playwright/test"
import { resetE2eDecks } from "./decks-reset"
import { fitAtCaptureSize, copyPng } from "./stage-capture"

test.beforeEach(() => resetE2eDecks())

test("Full-width table renders without a panel title and exports", async ({
  page,
  request,
}) => {
  expect(
    (
      await request.put("/api/decks/full-width", {
        data: {
          pages: [
            {
              id: "table",
              layout: "full-width-panel",
              title: "What the pilot has verified",
              panel: {
                kind: "table",
                title: "",
                columns: ["Check", "Result", "Page"],
                referenceColumn: 2,
                rows: [{ cells: ["Cold export", "8 s average", "03"] }],
              },
            },
          ],
        },
      })
    ).ok()
  ).toBe(true)
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"])
  await page.goto("/?deck=full-width")
  await expect(
    page.getByTestId("stage-frame").getByRole("heading", {
      name: "What the pilot has verified",
      exact: true,
    })
  ).toBeVisible()
  await fitAtCaptureSize(page)
  await copyPng(page, "full-width-table.png")
})

const tableCopy = {
  en: {
    title: "What the fictional pilot has verified",
    columns: ["Check", "Result", "Reference"],
    cells: [
      "Cold export of the sample deck",
      "8 s average; no failed pages",
      "§ 03",
    ],
    boundary: "One fictional deck on one machine; results are illustrative.",
  },
  zh: {
    title: "虛構試行計畫已完成的驗證",
    columns: ["檢查項目", "結果", "參照"],
    cells: ["樣本簡報冷啟動匯出", "平均八秒，沒有失敗頁面", "§ 03"],
    boundary: "一份虛構簡報、一台機器；數字僅供示意。",
  },
  mixed: {
    title: "Fictional pilot 已完成的驗證",
    columns: ["Check 檢查", "Result 結果", "Reference 參照"],
    cells: ["Cold export 樣本簡報", "8 s average，沒有失敗頁面", "§ 03"],
    boundary: "One fictional deck，一台機器；數字僅供示意。",
  },
} as const

for (const theme of ["default", "observatory"] as const) {
  for (const language of ["en", "zh", "mixed"] as const) {
    test(`${theme} Full-width table exports sparse and dense ${language} content without changing reference indices`, async ({
      page,
      request,
    }) => {
      test.slow()
      const content = tableCopy[language]
      const panels = [1, 5].map((count) => ({
        kind: "table",
        title: "",
        columns: content.columns,
        referenceColumn: 2,
        rows: Array.from({ length: count }, () => ({
          cells: content.cells,
          emphasis: [0],
        })),
      }))
      expect(
        (
          await request.put("/api/decks/full-width-matrix", {
            data: {
              theme,
              title: "Harbor Forecast",
              pages: panels.map((panel, index) => ({
                id: `table-${index}`,
                layout: "full-width-panel",
                title: content.title,
                panel,
                ...(index ? { boundary: content.boundary } : {}),
              })),
            },
          })
        ).ok()
      ).toBe(true)
      await page
        .context()
        .grantPermissions(["clipboard-read", "clipboard-write"])
      for (const index of [0, 1]) {
        await page.goto(`/?deck=full-width-matrix&page=${index + 1}`)
        const stage = page.getByTestId("stage-frame")
        await expect(
          stage.getByRole("heading", { name: content.title, exact: true })
        ).toBeVisible()
        await expect(stage.getByRole("heading")).toHaveCount(1)
        await fitAtCaptureSize(page)
        const table = stage.getByRole("table")
        const rows = table.locator("tbody tr")
        await expect(rows).toHaveCount(index ? 5 : 1)
        const cells = rows.first().locator("td:visible,th:visible")
        expect(await cells.allTextContents()).toEqual(
          theme === "observatory"
            ? ["01", ...content.cells]
            : [...content.cells]
        )
        expect(
          await table.locator("thead th:visible").allTextContents()
        ).toEqual(
          theme === "observatory"
            ? ["", ...content.columns]
            : [...content.columns]
        )
        const reference = rows
          .first()
          .getByRole("cell", { name: "§ 03", exact: true })
        const style = await reference.evaluate((element) => {
          const style = getComputedStyle(element)
          return {
            align: style.textAlign,
            wrap: style.whiteSpace,
            color: style.color,
            font: style.fontFamily,
          }
        })
        expect(style.align).toBe("right")
        expect(style.wrap).toBe("nowrap")
        expect(style.color).toBe(
          theme === "observatory" ? "rgb(40, 123, 120)" : "rgb(46, 117, 182)"
        )
        if (theme === "observatory")
          expect(style.font).toContain("IBM Plex Mono")
        await copyPng(page, `${theme}-${language}-table-${index ? 5 : 1}.png`)
      }
      const stored = await (
        await request.get("/decks/full-width-matrix.json")
      ).json()
      expect(stored.pages[1].panel.referenceColumn).toBe(2)
      expect(stored.pages[1].panel.columns).toEqual(content.columns)
      expect(stored.pages[1].panel.rows[0].cells).toEqual(content.cells)
    })
  }
}

for (const theme of ["default", "observatory"] as const) {
  test(`${theme} Full-width chart, flow and checklist export sparse and dense content`, async ({
    page,
    request,
  }) => {
    test.slow()
    const panels = [1, 4].flatMap((count) => [
      {
        kind: "flow",
        title: "",
        steps: Array.from({ length: count }, (_, index) => ({
          label: `Pilot check ${index + 1}`,
          caption: "Verify the fictional sample",
          variant: index === count - 1 ? "ok" : "default",
        })),
      },
      {
        kind: "checklist",
        title: "",
        items: Array.from({ length: count }, (_, index) => ({
          label: `Record fictional check ${index + 1}`,
          checked: index === 0,
        })),
      },
      {
        kind: "chart",
        title: "",
        categories: Array.from(
          { length: count },
          (_, index) => `Site ${index + 1}`
        ),
        series: [
          {
            name: "Observed",
            values: Array.from({ length: count }, (_, index) => index + 2),
          },
          { name: "Remaining", values: Array.from({ length: count }, () => 1) },
        ],
      },
    ])
    expect(
      (
        await request.put("/api/decks/full-width-kinds", {
          data: {
            theme,
            pages: panels.map((panel, index) => ({
              id: `panel-${index}`,
              layout: "full-width-panel",
              title: `Fictional pilot ${panel.kind} checks`,
              panel,
            })),
          },
        })
      ).ok()
    ).toBe(true)
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"])
    for (const [index, panel] of panels.entries()) {
      await page.goto(`/?deck=full-width-kinds&page=${index + 1}`)
      const stage = page.getByTestId("stage-frame")
      await expect(
        stage.getByRole("heading", {
          name: `Fictional pilot ${panel.kind} checks`,
          exact: true,
        })
      ).toBeVisible()
      await expect(stage.getByRole("heading")).toHaveCount(1)
      await fitAtCaptureSize(page)
      if (panel.kind === "flow")
        await expect(stage.getByTestId("flow-step")).toHaveCount(
          index < 3 ? 1 : 4
        )
      if (panel.kind === "checklist")
        await expect(stage.getByRole("listitem")).toHaveCount(index < 3 ? 1 : 4)
      if (panel.kind === "chart")
        await expect(stage.getByText("Observed", { exact: true })).toBeVisible()
      await copyPng(page, `${theme}-${panel.kind}-${index < 3 ? 1 : 4}.png`)
    }
  })

  test(`${theme} Two-column table keeps data columns and reference styling without row indices`, async ({
    page,
    request,
  }) => {
    expect(
      (
        await request.put("/api/decks/two-column-reference", {
          data: {
            theme,
            pages: [
              {
                id: "table",
                layout: "two-column",
                title: "Fictional pilot checks",
                items: Array.from({ length: 3 }, (_, index) => ({
                  heading: `Check ${index + 1}`,
                  body: "Record the fictional result.",
                })),
                panel: {
                  kind: "table",
                  title: "Verification",
                  columns: ["Check", "Reference"],
                  referenceColumn: 1,
                  rows: [{ cells: ["Cold export", "§ 03"] }],
                },
              },
            ],
          },
        })
      ).ok()
    ).toBe(true)
    await page.goto("/?deck=two-column-reference")
    const table = page.getByTestId("stage-frame").getByRole("table")
    await expect(table).toBeVisible()
    await fitAtCaptureSize(page)
    expect(await table.locator("thead th:visible").allTextContents()).toEqual([
      "Check",
      "Reference",
    ])
    expect(
      await table
        .locator("tbody tr")
        .first()
        .locator("td:visible")
        .allTextContents()
    ).toEqual(["Cold export", "§ 03"])
    const reference = table.getByRole("cell", { name: "§ 03", exact: true })
    expect(
      await reference.evaluate((element) => getComputedStyle(element).textAlign)
    ).toBe("right")
    await page.getByRole("button", { name: "Edit", exact: true }).click()
    await page
      .getByRole("combobox", { name: "Reference column", exact: true })
      .click()
    await page.getByRole("option", { name: "None", exact: true }).click()
    await page.getByRole("button", { name: "Save", exact: true }).click()
    await expect(page.getByText("Saved", { exact: true })).toBeVisible()
    const stored = await (
      await request.get("/decks/two-column-reference.json")
    ).json()
    expect(stored.pages[0].panel).not.toHaveProperty("referenceColumn")
  })

  test(`${theme} Full-width overflow blocks Copy and skips only that page in batch`, async ({
    page,
    request,
  }) => {
    expect(
      (
        await request.put("/api/decks/full-width-limit", {
          data: {
            theme,
            pages: [
              { id: "cover", layout: "cover", title: "Fictional pilot" },
              {
                id: "table",
                layout: "full-width-panel",
                title: "Unabridged pilot checks",
                panel: {
                  kind: "table",
                  title: "",
                  columns: ["Check", "Result"],
                  rows: Array.from({ length: 25 }, (_, index) => ({
                    cells: [
                      `Check ${index + 1}`,
                      "The fictional pilot has a recorded result.",
                    ],
                  })),
                },
                boundary: "Fictional sample only",
              },
            ],
          },
        })
      ).ok()
    ).toBe(true)
    await page.goto("/?deck=full-width-limit&page=2")
    await expect(
      page
        .getByTestId("stage-frame")
        .getByRole("heading", { name: "Unabridged pilot checks", exact: true })
    ).toBeVisible()
    await page
      .getByRole("button", { name: "Copy to clipboard", exact: true })
      .click()
    await expect(
      page
        .locator("p[role='alert']")
        .filter({ hasText: "Page overflows the 1280 × 720 capture stage" })
    ).toBeVisible()
    const download = page.waitForEvent("download")
    await page
      .getByRole("button", { name: "Download PNGs", exact: true })
      .click()
    expect((await download).suggestedFilename()).toBe(
      "full-width-limit-cover.png"
    )
    await expect(
      page.getByRole("status").filter({ hasText: "Skipped pages" })
    ).toContainText("table: Page overflows")
  })
}

test("authors, reloads and reuses a Full-width table reference column", async ({
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
          pages: [{ id: "cover", layout: "cover", title: "Fictional pilot" }],
        },
      })
    ).ok()
  ).toBe(true)
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"])
  await page.goto("/?deck=2026-11-02")
  await page.getByRole("button", { name: "Edit", exact: true }).click()
  await page.getByRole("combobox", { name: "Add page", exact: true }).click()
  await page
    .getByRole("option", { name: "Full-width Panel", exact: true })
    .click()
  await expect(
    page.getByRole("combobox", { name: "Panel", exact: true })
  ).toBeVisible()
  await page.getByRole("button", { name: "Add page", exact: true }).click()
  await expect(
    page.getByRole("alert").filter({ hasText: "Draft Page" })
  ).toBeVisible()
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("What the pilot has verified")
  await page.getByRole("button", { name: "Add column", exact: true }).click()
  await page.getByRole("button", { name: "Add column", exact: true }).click()
  for (const [index, label] of ["Check", "Result", "Reference"].entries()) {
    await page
      .getByRole("textbox", { name: `Column ${index + 1}`, exact: true })
      .fill(label)
  }
  for (const [index, value] of [
    "Cold export",
    "8 s average",
    "§ 03",
  ].entries()) {
    await page
      .getByRole("textbox", { name: `Row 1, col ${index + 1}`, exact: true })
      .fill(value)
  }
  await page
    .getByRole("combobox", { name: "Reference column", exact: true })
    .click()
  await page.getByRole("option", { name: "Reference", exact: true }).click()
  await page.getByRole("button", { name: "Remove column", exact: true }).click()
  await expect(
    page.getByRole("combobox", { name: "Reference column", exact: true })
  ).toContainText("None")
  await page.getByRole("button", { name: "Add column", exact: true }).click()
  await page
    .getByRole("textbox", { name: "Column 3", exact: true })
    .fill("Reference")
  await page
    .getByRole("textbox", { name: "Row 1, col 3", exact: true })
    .fill("§ 03")
  await page
    .getByRole("combobox", { name: "Reference column", exact: true })
    .click()
  await page.getByRole("option", { name: "Reference", exact: true }).click()
  await page
    .getByRole("textbox", { name: "Boundary Note", exact: true })
    .fill("Fictional sample only")
  await expect(
    page.getByRole("textbox", { name: "Panel title", exact: true })
  ).toHaveValue("")
  await expect(
    page.getByRole("alert").filter({ hasText: "Draft Page" })
  ).toHaveCount(0)
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await expect(page.getByText("Saved", { exact: true })).toBeVisible()
  await page.reload()
  await expect(
    page.getByTestId("stage-frame").getByRole("heading", {
      name: "What the pilot has verified",
      exact: true,
    })
  ).toBeVisible()
  await copyPng(page, "authored-full-width-table.png")
  const saved = await (await request.get("/decks/2026-11-02.json")).json()
  expect(saved.pages[1]).toMatchObject({
    layout: "full-width-panel",
    boundary: "Fictional sample only",
    panel: {
      kind: "table",
      title: "",
      referenceColumn: 2,
      columns: ["Check", "Result", "Reference"],
      rows: [{ cells: ["Cold export", "8 s average", "§ 03"] }],
    },
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
    layout: "full-width-panel",
    title: "",
    panel: {
      kind: "table",
      title: "",
      referenceColumn: 2,
      columns: ["", "", ""],
      rows: [{ cells: ["", "", ""] }],
    },
  })
  expect(reused.pages[1]).not.toHaveProperty("boundary")
})
