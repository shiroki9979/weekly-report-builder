import {
  expect,
  test,
  type APIRequestContext,
  type Locator,
  type Page as BrowserPage,
} from "@playwright/test"
import { readFileSync, mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

import {
  parseDeck,
  isTwoColumnPage,
  isOverviewPage,
  isEvidenceDecisionPage,
  isNextActionsPage,
  isTrendTargetPage,
  isSideBySidePage,
  periodLabel,
  type Deck,
  type Page,
  type DeckTheme,
  DECK_THEMES,
} from "../../src/lib/deck"
import { resetE2eDecks, e2eDecksDir } from "./decks-reset"
import { fitAtCaptureSize, copyPng } from "./stage-capture"
import { matchStageStyle, type StyleProbe } from "./stage-style"
import { THEME_EXPECTATIONS } from "./theme-expectations"

const demo = parseDeck(
  JSON.parse(
    readFileSync(
      path.resolve(import.meta.dirname, "../../demo/demo-default.json"),
      "utf8"
    )
  )
)

test.beforeEach(() => resetE2eDecks())

test("edits the Deck Theme and Deck Title, then saves and reloads the same Stage", async ({
  page,
  request,
}) => {
  const deck = { ...demo, pages: [demo.pages[1]] }
  expect(
    (await request.put("/api/decks/theme-review", { data: deck })).ok()
  ).toBe(true)
  await page.goto("/?deck=theme-review")
  const stage = page.getByTestId("stage-frame")
  await expect(stage).toHaveAttribute("data-theme", "default")
  await expect(page.getByRole("combobox", { name: "Theme" })).toBeDisabled()
  await expect(page.getByRole("textbox", { name: "Deck Title" })).toBeDisabled()

  await page.getByRole("button", { name: "Edit", exact: true }).click()
  await page.getByRole("combobox", { name: "Theme" }).click()
  await page.getByRole("option", { name: "Observatory", exact: true }).click()
  await page
    .getByRole("textbox", { name: "Deck Title" })
    .fill("Harbor Forecast pilot review")
  await expect(stage).toHaveAttribute("data-theme", "observatory")
  await expect(stage.locator("h1")).toHaveCSS("color", "rgb(32, 56, 75)")
  await expect(
    stage.getByText("Harbor Forecast pilot review", { exact: true })
  ).toBeVisible()
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await expect(page.getByText("Saved", { exact: true })).toBeVisible()

  const saved = await (await request.get("/decks/theme-review.json")).json()
  expect(saved.theme).toBe("observatory")
  expect(saved.title).toBe("Harbor Forecast pilot review")
  await page.reload()
  await expect(stage).toHaveAttribute("data-theme", "observatory")
  await expect(
    stage.getByText("Harbor Forecast pilot review", { exact: true })
  ).toBeVisible()
})

const table = parseDeck(
  JSON.parse(
    readFileSync(
      path.resolve(import.meta.dirname, "fixtures/decks/2026-08-24.json"),
      "utf8"
    )
  )
).pages[0]

// 示範週的頁序會隨 Demo Deck Set 演進，fixture 依版型而非位置挑頁
function demoPage<T extends Page>(pick: (page: Page) => page is T): T {
  const found = demo.pages.find(pick)
  if (!found) throw new Error("Demo fixture page is missing")
  return structuredClone(found)
}

function themeFixture(theme: DeckTheme): Deck {
  const chart = demoPage(isTwoColumnPage)
  if (chart.panel.kind !== "chart") throw new Error("Chart fixture is missing")
  chart.panel.series[0].color = undefined
  chart.panel.series[1].color = undefined
  chart.panel.series[2].color = "#a14188"
  const overview = demoPage(isOverviewPage)
  overview.supporting[0].status = { label: "Watch", tone: "caution" }
  return {
    ...demo,
    theme,
    title: "Harbor Forecast pilot review",
    pages: [
      overview,
      demoPage(isEvidenceDecisionPage),
      demoPage(isNextActionsPage),
      demoPage(isTrendTargetPage),
      chart,
      table,
    ].map((entry, index) => ({ ...entry, id: `p${index + 1}` })),
  }
}

// 顯示 item index 的主題共用同一組外觀；Side-by-side 與 Two-column 都以此釘住
const ITEM_INDEX_LOOK: StyleProbe = {
  mono: true,
  color: "--mute",
  fontSize: "0.9375cqw",
  paddingTop: "0.46875cqw",
}

async function expectItemIndexLook(index: Locator) {
  // dev server 的 CSS 由模組非同步注入；輪詢到主題樣式生效為止
  await expect
    .poll(() => matchStageStyle(index, ITEM_INDEX_LOOK))
    .toEqual([{ mono: true, color: true, fontSize: true, paddingTop: true }])
}

for (const theme of DECK_THEMES) {
  const expected = THEME_EXPECTATIONS[theme]
  test(`renders six existing layouts at capture size with ${theme} roles`, async ({
    page,
    request,
  }) => {
    await page.context().grantPermissions(["clipboard-write", "clipboard-read"])
    const deck = themeFixture(theme)
    expect(
      (await request.put(`/api/decks/${theme}-review`, { data: deck })).ok()
    ).toBe(true)
    for (const [index, entry] of deck.pages.entries()) {
      await page.goto(`/?deck=${theme}-review&page=${index + 1}`)
      const stage = page.getByTestId("stage-frame")
      await expect(
        stage.getByRole("heading", { name: entry.title, exact: true })
      ).toBeVisible()
      await expect(stage).toHaveAttribute("data-theme", theme)
      // Two-column 也走 Editorial Frame：翻頁時日期列與頁尾不因版型忽有忽無
      await expect(stage.locator(".editorial-period")).toHaveText(
        periodLabel(deck.period)
      )
      await expect(stage.locator(".editorial-deck-title")).toHaveText(
        deck.title!
      )
      const total = deck.pages.length
      await expect(
        stage.locator(
          expected.paddedPageNumbers
            ? ".editorial-number-padded"
            : ".editorial-number-default"
        )
      ).toHaveText(
        expected.paddedPageNumbers
          ? `0${index + 1} / 0${total}`
          : `${index + 1} / ${total}`
      )
      await fitAtCaptureSize(page)
      await copyPng(page, `${theme}-${entry.layout}-${index}.png`)
      if (index === 0) {
        await expect(stage.locator(".editorial-lead")).toHaveCSS(
          "background-color",
          expected.leadBackground
        )
        const ratios = await stage
          .locator(".editorial-status")
          .evaluateAll((elements) => {
            const luminance = (rgb: string) => {
              const channels = rgb
                .match(/[\d.]+/g)!
                .slice(0, 3)
                .map(Number)
                .map((value) => {
                  const channel = value / 255
                  return channel <= 0.04045
                    ? channel / 12.92
                    : ((channel + 0.055) / 1.055) ** 2.4
                })
              return (
                0.2126 * channels[0] +
                0.7152 * channels[1] +
                0.0722 * channels[2]
              )
            }
            return elements.map((element) => {
              let background = "rgb(255, 255, 255)"
              for (
                let ancestor: Element | null = element;
                ancestor;
                ancestor = ancestor.parentElement
              ) {
                const color = getComputedStyle(ancestor).backgroundColor
                if (color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
                  background = color
                  break
                }
              }
              const ink = luminance(getComputedStyle(element).color)
              const paper = luminance(background)
              return (
                (Math.max(ink, paper) + 0.05) / (Math.min(ink, paper) + 0.05)
              )
            })
          })
        expect(ratios).toHaveLength(3)
        for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(4.5)
      }
      if (index === 3) {
        const expectedInk = expected.ink
        for (const [mark, attribute, expected] of [
          ["line", "stroke", expectedInk.accent],
          ["point", "fill", expectedInk.accent],
          ["point", "stroke", "#ffffff"],
          ["grid", "stroke", expectedInk.line],
          ["axis", "fill", expectedInk.mute],
          ["missing", "fill", expectedInk.mute],
          ["target", "stroke", "#8a5508"],
        ]) {
          await expect(
            stage.locator(`svg .editorial-trend-${mark}`).first()
          ).toHaveAttribute(attribute, expected)
        }
      }
      if (index === 4) {
        const colors = await stage
          .locator(".stage-chart-legend i")
          .evaluateAll((nodes) =>
            nodes.map((node) => getComputedStyle(node).backgroundColor)
          )
        expect(colors).toEqual(expected.legend)
      }
    }
  })

  test(`keeps the ${theme} Editorial Frame body stable when footer slots are empty`, async ({
    page,
    request,
  }) => {
    const deck = themeFixture(theme)
    // Overview 與 Two-column 各代表一種構圖，兩者都要不受頁尾空槽影響
    for (const framed of [deck.pages[0], deck.pages[4]]) {
      const heights: number[] = []
      for (const [title, showPageNumbers] of [
        ["Harbor Forecast", true],
        [undefined, true],
        ["Harbor Forecast", false],
        [undefined, false],
      ] as const) {
        expect(
          (
            await request.put("/api/decks/footer-review", {
              data: { ...deck, title, showPageNumbers, pages: [framed] },
            })
          ).ok()
        ).toBe(true)
        await page.goto("/?deck=footer-review")
        await fitAtCaptureSize(page)
        heights.push(
          await page
            .getByTestId("stage-frame")
            .locator(".editorial-body")
            .evaluate((element) => element.getBoundingClientRect().height)
        )
        const index = page
          .getByTestId("stage-frame")
          .locator(".editorial-page-index")
        if (expected.paddedPageNumbers && showPageNumbers) {
          await expect(index).toBeVisible()
          await expect(index).toHaveText("§ 01")
          await expect(
            page.getByTestId("stage-frame").locator(".editorial-number-padded")
          ).toHaveText("01 / 01")
        } else await expect(index).not.toBeVisible()
        if (!showPageNumbers)
          await expect(
            page.getByTestId("stage-frame").locator(".editorial-page-label")
          ).toHaveCount(0)
      }
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(
        0.1
      )
    }
  })

  test(`embeds only fonts in use in ${theme} capture`, async ({
    page,
    request,
  }) => {
    const deck = themeFixture(theme)
    expect(
      (
        await request.put("/api/decks/font-review", {
          data: { ...deck, pages: [deck.pages[0]] },
        })
      ).ok()
    ).toBe(true)
    await page.goto("/?deck=font-review")
    await fitAtCaptureSize(page)
    const faces = await page
      .getByTestId("stage-frame")
      .evaluate(async (element) => {
        const moduleUrl = "/node_modules/.vite/deps/html-to-image.js"
        const { toSvg } = await import(moduleUrl)
        const encoded = await toSvg(element)
        const svg = decodeURIComponent(encoded.slice(encoded.indexOf(",") + 1))
        return [...svg.matchAll(/@font-face\s*\{[^}]+\}/g)].map(
          (match) => match[0]
        )
      })
    const embeds = (family: RegExp) =>
      faces.some((face) => family.test(face) && /data:.*base64/.test(face))
    // Overview 的 workstream、status 與頁尾用到 --mono；只有外框改用它的主題才嵌入等寬字
    expect({
      instrumentSans: embeds(/Instrument Sans/),
      ibmPlexMono: embeds(/IBM Plex Mono/),
    }).toEqual({
      instrumentSans: expected.embedsInstrumentSans,
      ibmPlexMono: expected.hostsIbmPlexMono && expected.frameFont === "mono",
    })
  })

  test(`shows the shared item index on Side-by-side points only where ${theme} enables it`, async ({
    page,
    request,
  }) => {
    expect(
      (
        await request.put("/api/decks/item-index", {
          data: { ...demo, theme, pages: [demoPage(isSideBySidePage)] },
        })
      ).ok()
    ).toBe(true)
    await page.goto("/?deck=item-index")
    const stage = page.getByTestId("stage-frame")
    await expect(stage).toHaveAttribute("data-theme", theme)
    const index = stage
      .locator(".editorial-comparison-points li > .editorial-item-index")
      .first()
    await expect(index).toHaveText("01")
    await expect(index).toHaveAttribute("aria-hidden", "true")
    if (!expected.itemIndex) {
      await expect(index).toBeHidden()
      return
    }
    await expect(index).toBeVisible()
    await expectItemIndexLook(index)
  })

  test(`marks Two-column items with the ${theme} item treatment`, async ({
    page,
    request,
  }) => {
    expect(
      (
        await request.put("/api/decks/two-column-items", {
          data: { ...demo, theme, pages: [demoPage(isTwoColumnPage)] },
        })
      ).ok()
    ).toBe(true)
    await page.goto("/?deck=two-column-items")
    const stage = page.getByTestId("stage-frame")
    await expect(stage).toHaveAttribute("data-theme", theme)
    const items = stage.locator(".stage-item")
    await expect(items).toHaveCount(3)
    const indexes = items.locator(".editorial-item-index")
    // 索引只是視覺處理：三個項目平行無序，輔助技術不該讀到編號
    await expect(indexes).toHaveText(["01", "02", "03"])
    for (const index of await indexes.all())
      await expect(index).toHaveAttribute("aria-hidden", "true")
    const first = items.first()
    const index = first.locator(".editorial-item-index")
    await expect(index).toBeVisible({ visible: expected.itemIndex })
    await expect(first.locator(".stage-dot")).toBeVisible({
      visible: !expected.itemIndex,
    })
    // dev server 的 CSS 由模組非同步注入；輪詢到主題樣式生效為止
    await expect
      .poll(() =>
        matchStageStyle(first.locator("h3"), {
          color: expected.twoColumnHeading,
        })
      )
      .toEqual([{ color: true }])
    // 外觀與 Side-by-side point 的索引是同一組規則
    if (expected.itemIndex) await expectItemIndexLook(index)
  })

  test(`sets the Editorial Frame furniture in the ${theme} frame font and the rest in the body font`, async ({
    page,
    request,
  }) => {
    const deck = themeFixture(theme)
    const overview = {
      ...deck.pages[0],
      boundary: "Fictional sample of one promote cycle.",
    }
    expect(
      (
        await request.put("/api/decks/mono-frame", {
          data: { ...deck, pages: [overview] },
        })
      ).ok()
    ).toBe(true)
    await page.goto("/?deck=mono-frame")
    const stage = page.getByTestId("stage-frame")
    await expect(stage.locator(".editorial-boundary")).toBeVisible()
    await expect(stage.locator(".editorial-page-label")).toBeVisible()
    const furniture = [
      ".editorial-eyebrow",
      ".editorial-period",
      ".editorial-workstream",
      ".editorial-status",
      ".editorial-deck-title",
      ".editorial-page-label",
      ".editorial-boundary",
    ]
    const content = [
      ".editorial-headline",
      ".editorial-figure",
      ".editorial-result",
      ".editorial-impact",
    ]
    // dev server 的 CSS 由模組非同步注入；輪詢到主題樣式生效為止
    await expect
      .poll(async () =>
        Object.fromEntries(
          await Promise.all(
            [...furniture, ...content].map(async (selector) => {
              const matches = await matchStageStyle(stage.locator(selector), {
                mono: true,
                body: true,
              })
              if (matches.length === 0) return [selector, "missing"]
              // 只比「不是 --mono」的話，退成瀏覽器預設字型也會通過，所以要求每個元素明確落在兩者之一
              const fonts = new Set(
                matches.map(({ mono, body }) =>
                  mono ? "mono" : body ? "body" : "other"
                )
              )
              return [selector, [...fonts].join("+")]
            })
          )
        )
      )
      .toEqual(
        Object.fromEntries([
          ...furniture.map((selector) => [selector, expected.frameFont]),
          ...content.map((selector) => [selector, "body"]),
        ])
      )
  })
}

const MONO_HTML =
  '<div style="padding:5%"><p id="html-body">Pilot timeline 試行時程</p><p id="html-mono" style="font-family:var(--mono)">2026-11-20 · 12 runs</p></div>'
const PLAIN_HTML =
  '<div style="padding:5%"><p id="html-body">Pilot timeline 試行時程</p><p id="html-mono">2026-11-20 · 12 runs</p></div>'

async function putHtmlFontDeck(
  request: APIRequestContext,
  theme: DeckTheme,
  html = MONO_HTML
) {
  const id = `${theme}-html-font`
  const dir = path.join(e2eDecksDir(), id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, "fonts.html"), html)
  expect(
    (
      await request.put(`/api/decks/${id}`, {
        data: {
          theme,
          pages: [
            {
              id: "html",
              layout: "html",
              title: "Font inheritance",
              htmlFile: "fonts.html",
            },
          ],
        },
      })
    ).ok()
  ).toBe(true)
}

// HTML Page 匯出走離屏 capture host 的 light DOM，必須從那裡取 SVG 才代表實際 PNG
function htmlPageCaptureFaces(
  page: BrowserPage,
  deckId: string
): Promise<string[]> {
  return page.evaluate(async (deckId) => {
    const deckModule = "/src/lib/deck.ts"
    const adapterModule = "/src/lib/browser-capture-adapter.tsx"
    const imageModule = "/node_modules/.vite/deps/html-to-image.js"
    const { parseDeck } = await import(deckModule)
    const { browserCaptureAdapter } = await import(adapterModule)
    const { toSvg } = await import(imageModule)
    const deck = parseDeck(await (await fetch(`/decks/${deckId}.json`)).json())
    const prepared = await browserCaptureAdapter.prepare(
      deckId,
      deck,
      deck.pages[0]
    )
    if ("kind" in prepared) throw new Error(prepared.message)
    try {
      const root = [
        ...document.querySelectorAll("[data-stage-capture-root]"),
      ].find((element) => element.closest('[aria-hidden="true"]'))
      if (!root?.querySelector("#html-mono"))
        throw new Error("Capture host has no HTML Page")
      const encoded = await toSvg(root)
      const svg = decodeURIComponent(encoded.slice(encoded.indexOf(",") + 1))
      return [...svg.matchAll(/@font-face\s*\{[^}]+\}/g)].map(
        (match) => match[0]
      )
    } finally {
      prepared.dispose()
    }
  }, deckId)
}

// --mono 是 HTML Page 契約的一部分；新增主題時不能漏定義
for (const theme of DECK_THEMES) {
  test(`defines the --mono role under the ${theme} theme`, async ({
    page,
    request,
  }) => {
    const deck = themeFixture(theme)
    expect(
      (
        await request.put("/api/decks/mono-review", {
          data: { ...deck, pages: [deck.pages[0]] },
        })
      ).ok()
    ).toBe(true)
    await page.goto("/?deck=mono-review")
    const stage = page.getByTestId("stage-frame")
    await expect(stage).toHaveAttribute("data-theme", theme)
    // dev server 的 CSS 由模組非同步注入，寫入 Deck 後也可能重新載入；輪詢到樣式生效為止
    await expect
      .poll(() =>
        stage.evaluate((element) =>
          getComputedStyle(element).getPropertyValue("--mono").trim()
        )
      )
      .not.toBe("")
  })

  test(`HTML Page text without a font-family inherits the ${theme} body font`, async ({
    page,
    request,
  }) => {
    await putHtmlFontDeck(request, theme)
    await page.goto(`/?deck=${theme}-html-font`)
    const stage = page.getByTestId("stage-frame")
    await expect(stage.locator("#html-mono")).toBeVisible()
    await expect
      .poll(() =>
        stage.locator("#html-body").evaluate((element) => {
          const stageRoot = (element.getRootNode() as ShadowRoot).host.closest(
            ".stage-root"
          )!
          const theme = getComputedStyle(stageRoot).fontFamily
          return {
            inherits: getComputedStyle(element).fontFamily === theme,
            // 確認 Stage 樣式已生效，避免兩邊都還是文件預設字型而空洞通過
            themed: theme !== getComputedStyle(document.body).fontFamily,
          }
        })
      )
      .toEqual({ inherits: true, themed: true })
  })

  test(`embeds IBM Plex Mono for var(--mono) in a ${theme} HTML Page capture only when the theme hosts it`, async ({
    page,
    request,
  }) => {
    await putHtmlFontDeck(request, theme)
    await page.goto(`/?deck=${theme}-html-font`)
    await expect(
      page.getByTestId("stage-frame").locator("#html-mono")
    ).toBeVisible()
    const plexMono = (
      await htmlPageCaptureFaces(page, `${theme}-html-font`)
    ).filter((face) => /IBM Plex Mono/.test(face) && /data:.*base64/.test(face))
    if (THEME_EXPECTATIONS[theme].hostsIbmPlexMono)
      expect(plexMono).not.toEqual([])
    else expect(plexMono).toEqual([])
  })

  test(`leaves IBM Plex Mono out of a ${theme} HTML Page capture that uses no monospace`, async ({
    page,
    request,
  }) => {
    await putHtmlFontDeck(request, theme, PLAIN_HTML)
    await page.goto(`/?deck=${theme}-html-font`)
    await expect(
      page.getByTestId("stage-frame").locator("#html-mono")
    ).toBeVisible()
    const plexMono = (
      await htmlPageCaptureFaces(page, `${theme}-html-font`)
    ).filter((face) => /IBM Plex Mono/.test(face))
    expect(plexMono).toEqual([])
  })
}

test("HTML Page role and legacy tokens follow the theme while literal colours remain authored", async ({
  page,
  request,
}) => {
  const dir = path.join(e2eDecksDir(), "html-theme")
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    path.join(dir, "sample.html"),
    '<div style="padding:5%"><p id="theme-legacy" style="color:var(--blue)">Legacy accent</p><p id="theme-role" style="color:var(--accent)">Role accent</p><p id="theme-literal" style="color:#a14188">Authored colour</p></div>'
  )
  for (const theme of DECK_THEMES) {
    expect(
      (
        await request.put("/api/decks/html-theme", {
          data: {
            theme,
            pages: [
              {
                id: "html",
                layout: "html",
                title: "Token inheritance",
                htmlFile: "sample.html",
              },
            ],
          },
        })
      ).ok()
    ).toBe(true)
    await page.goto("/?deck=html-theme")
    const expected = THEME_EXPECTATIONS[theme].legend[0]
    await expect(page.locator("#theme-legacy")).toHaveCSS("color", expected)
    await expect(page.locator("#theme-role")).toHaveCSS("color", expected)
    await expect(page.locator("#theme-literal")).toHaveCSS(
      "color",
      "rgb(161, 65, 136)"
    )
  }
})

test("Trend PNG contains the Observatory series colour inside the SVG plot", async ({
  page,
  request,
}) => {
  const deck = themeFixture("observatory")
  expect(
    (
      await request.put("/api/decks/trend-theme", {
        data: { ...deck, pages: [deck.pages[3]] },
      })
    ).ok()
  ).toBe(true)
  await page.goto("/?deck=trend-theme")
  await fitAtCaptureSize(page)
  const sample = await page
    .getByTestId("stage-frame")
    .evaluate(async (element) => {
      const svg = element.querySelector("svg")!
      const plot = svg.getBoundingClientRect()
      const frame = element.getBoundingClientRect()
      const moduleUrl = "/src/lib/stage-capture.ts"
      const { captureStageToPng } = await import(moduleUrl)
      const blob = await captureStageToPng(element)
      const image = await createImageBitmap(blob)
      const canvas = document.createElement("canvas")
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext("2d")!
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(
        Math.round((plot.left - frame.left) * 2),
        Math.round((plot.top - frame.top) * 2),
        Math.floor(plot.width * 2),
        Math.floor(plot.height * 2)
      ).data
      let accentPixels = 0
      for (let offset = 0; offset < pixels.length; offset += 4) {
        if (
          pixels[offset] === 40 &&
          pixels[offset + 1] === 123 &&
          pixels[offset + 2] === 120 &&
          pixels[offset + 3] === 255
        )
          accentPixels++
      }
      return {
        width: image.width,
        height: image.height,
        accentPixels,
        png: Array.from(new Uint8Array(await blob.arrayBuffer())),
      }
    })
  expect(sample.width).toBe(2560)
  expect(sample.height).toBe(1440)
  expect(sample.accentPixels).toBeGreaterThan(50)
  writeFileSync(
    test.info().outputPath("observatory-trend-capture.png"),
    Buffer.from(sample.png)
  )
})
