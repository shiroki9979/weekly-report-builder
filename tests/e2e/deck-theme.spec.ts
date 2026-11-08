import { expect, test } from "@playwright/test"
import { readFileSync, mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

import {
  parseDeck,
  isTwoColumnPage,
  isOverviewPage,
  isEvidenceDecisionPage,
  isNextActionsPage,
  isTrendTargetPage,
  type Deck,
  type Page,
  type DeckTheme,
} from "../../src/lib/deck"
import { resetE2eDecks, e2eDecksDir } from "./decks-reset"
import { fitAtCaptureSize, copyPng } from "./stage-capture"

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

for (const theme of ["default", "observatory"] as const) {
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
      await fitAtCaptureSize(page)
      await copyPng(page, `${theme}-${entry.layout}-${index}.png`)
      if (index === 0) {
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
        const expectedInk =
          theme === "default"
            ? { accent: "#2e75b6", mute: "#5c5c5c", line: "#d0d7de" }
            : { accent: "#287b78", mute: "#5a6e7e", line: "#d6dee4" }
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
        expect(colors).toEqual(
          theme === "default"
            ? ["rgb(46, 117, 182)", "rgb(126, 176, 214)", "rgb(161, 65, 136)"]
            : ["rgb(40, 123, 120)", "rgb(31, 95, 92)", "rgb(161, 65, 136)"]
        )
      }
    }
  })

  test(`keeps the ${theme} Editorial Frame body stable when footer slots are empty`, async ({
    page,
    request,
  }) => {
    const deck = themeFixture(theme)
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
            data: { ...deck, title, showPageNumbers, pages: [deck.pages[0]] },
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
      if (theme === "observatory" && showPageNumbers) {
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
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(0.1)
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
    const customFaces = faces.filter((face) =>
      /Instrument Sans|IBM Plex Mono/.test(face)
    )
    if (theme === "observatory") {
      expect(
        customFaces.some(
          (face) => /Instrument Sans/.test(face) && /data:.*base64/.test(face)
        )
      ).toBe(true)
      expect(
        customFaces.some(
          (face) => /IBM Plex Mono/.test(face) && /data:.*base64/.test(face)
        )
      ).toBe(true)
    } else expect(customFaces).toEqual([])
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
  for (const theme of ["default", "observatory"] as const) {
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
    const expected =
      theme === "default" ? "rgb(46, 117, 182)" : "rgb(40, 123, 120)"
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
