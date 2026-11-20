import { expect, test } from "@playwright/test"
import { cpSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"

import { isHtmlPage } from "../../src/lib/deck"
import { readDemoDecks } from "../demo-decks"
import { e2eDecksDir, resetE2eDecks } from "./decks-reset"
import { fitAtCaptureSize } from "./stage-capture"

const demoDir = resolve(import.meta.dirname, "../../demo")
const demoHtmlPages = readDemoDecks(demoDir).flatMap(({ id, deck }) =>
  deck.pages.filter(isHtmlPage).map((page) => ({ demoId: id, page }))
)

test.beforeEach(() => resetE2eDecks())

// 溢出量測只看內容是否超出 1280 × 720；本文若能縮到內容高度以下，
// 內容會蓋住頁尾卻仍判定為 fit，所以逐步加長同一段文字檢查這個不變式
const GROWTH_STEP = "More fictional pilot detail to review. "
const MAX_GROWTH_STEPS = 160

const layouts = [
  {
    id: "two-column",
    grow: ".stage-item p",
    page: {
      layout: "two-column",
      title: "Exports stay review-ready",
      items: [
        { heading: "Cold export", body: "No failed pages." },
        { heading: "Warm export", body: "Reuses unchanged pages." },
        { heading: "Fallback", body: "Per-page capture still works." },
      ],
      panel: {
        kind: "checklist",
        title: "Checks",
        items: [{ label: "Cold export", checked: true }],
      },
    },
  },
  {
    id: "comparison",
    grow: ".editorial-comparison-points li",
    page: {
      layout: "side-by-side",
      title: "Cache rendered pages and keep a fallback",
      columns: [
        { label: "Cached renders", points: ["Reuses unchanged pages."] },
        { label: "Per-page capture", points: ["No cache state."] },
      ],
      chosen: 0,
      tradeoff: { why: "Repeated exports", cost: "Cache invalidation" },
    },
  },
  {
    id: "closing",
    grow: ".editorial-takeaways p",
    page: {
      layout: "closing",
      title: "Continue the pilot",
      takeaways: [{ ref: "01", text: "Verify the remaining assumptions." }],
      closingLine: "Contact the team for the next review.",
    },
  },
  {
    id: "full-width",
    grow: ".stage-panel td:last-child",
    page: {
      layout: "full-width-panel",
      title: "Pilot checks",
      panel: {
        kind: "table",
        title: "",
        columns: ["Check", "Result"],
        rows: [{ cells: ["Cold export", "No failed pages."] }],
      },
    },
  },
] as const

const closingLayout = layouts.find((layout) => layout.id === "closing")!

for (const theme of ["default", "observatory"] as const) {
  for (const layout of layouts) {
    test(`${theme} ${layout.id} without a Boundary Note never overlaps the footer while it fits`, async ({
      page,
      request,
    }) => {
      const deckId = `footer-${theme}-${layout.id}`
      const saved = await request.put(`/api/decks/${deckId}`, {
        data: {
          theme,
          title: "Harbor Forecast",
          pages: [{ id: layout.id, ...layout.page }],
        },
      })
      expect(saved.ok()).toBe(true)
      await page.goto(`/?deck=${deckId}`)
      await fitAtCaptureSize(page)

      const hiddenOverlap = await page.getByTestId("stage-frame").evaluate(
        async (root, { selector, step, maxSteps }) => {
          const moduleUrl = "/src/lib/overflow-measurement.ts"
          const { measureStageOverflow } = await import(moduleUrl)
          const target = root.querySelector(selector)
          const footer = root.querySelector(".editorial-page-number")
          if (!target || !footer)
            throw new Error(`Missing ${selector} or footer`)
          const base = target.textContent ?? ""
          const contentBottom = () =>
            Math.max(
              ...[...root.querySelectorAll(".editorial-body *")].map(
                (element) => element.getBoundingClientRect().bottom
              )
            )
          for (let count = 1; count <= maxSteps; count++) {
            target.textContent = `${base} ${step.repeat(count)}`
            const result = await measureStageOverflow(root)
            if (result.status !== "fit") return null
            const footerTop = footer.getBoundingClientRect().top
            const bottom = contentBottom()
            if (bottom > footerTop + 1) return { count, bottom, footerTop }
          }
          throw new Error("Content never overflowed the capture stage")
        },
        { selector: layout.grow, step: GROWTH_STEP, maxSteps: MAX_GROWTH_STEPS }
      )

      expect(hiddenOverlap).toBeNull()
    })
  }
}

// HTML Page 的頁尾疊在片段上方；片段須讓出底部安全區，示範頁要以身作則
for (const theme of ["default", "observatory"] as const) {
  for (const { demoId, page: htmlPage } of demoHtmlPages) {
    test(`${theme} ${demoId} HTML Page ${htmlPage.id} keeps its content clear of the app-drawn footer`, async ({
      page,
      request,
    }) => {
      const deckId = `footer-${theme}-${demoId}-${htmlPage.id}`
      mkdirSync(resolve(e2eDecksDir(), deckId), { recursive: true })
      cpSync(
        resolve(demoDir, demoId, htmlPage.htmlFile),
        resolve(e2eDecksDir(), deckId, htmlPage.htmlFile)
      )
      const saved = await request.put(`/api/decks/${deckId}`, {
        data: {
          theme,
          title: "Harbor Forecast",
          pages: [
            { ...htmlPage, showPageNumber: true },
            { id: "closing", ...closingLayout.page },
          ],
        },
      })
      expect(saved.ok()).toBe(true)
      await page.goto(`/?deck=${deckId}`)
      const stage = page.getByTestId("stage-frame")
      await expect(stage.getByTestId("html-slide-shadow")).toHaveAttribute(
        "data-status",
        "ready"
      )
      await fitAtCaptureSize(page)
      const footer = stage.locator(".editorial-page-number")
      await expect(footer).toContainText("Harbor Forecast")
      await expect(footer).toBeVisible()

      const overlap = await stage.evaluate((root) => {
        const fragment = root.querySelector(
          "[data-testid='html-slide-shadow']"
        )?.shadowRoot
        const footer = root.querySelector(".editorial-page-number")
        if (!fragment || !footer) throw new Error("Missing fragment or footer")
        const stageBox = root.getBoundingClientRect()
        const footerTop = footer.getBoundingClientRect().top

        // 內容只算文字與圖形；鋪滿整頁的底色不算佔用安全區
        const rects: DOMRect[] = []
        const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT)
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.textContent?.trim()) continue
          if (node.parentElement?.closest("style, title, desc")) continue
          const range = document.createRange()
          range.selectNodeContents(node)
          rects.push(...range.getClientRects())
        }
        for (const shape of fragment.querySelectorAll(
          "svg *:not(g, title, desc, svg), img"
        )) {
          const box = shape.getBoundingClientRect()
          const coversStage =
            box.width >= stageBox.width - 1 && box.height >= stageBox.height - 1
          if (!coversStage) rects.push(box)
        }
        const visible = rects.filter((box) => box.width > 0 && box.height > 0)
        if (visible.length === 0) throw new Error("Fragment has no content")
        const bottom = Math.max(...visible.map((box) => box.bottom))
        return bottom > footerTop + 1 ? { bottom, footerTop } : null
      })

      expect(overlap).toBeNull()

      // 片段遵守的安全區以 Editorial Frame 頁尾為準，兩者必須落在同一位置
      const footerBox = () =>
        stage.evaluate((root) => {
          const stageBox = root.getBoundingClientRect()
          const box = root
            .querySelector(".editorial-page-number")!
            .getBoundingClientRect()
          return {
            top: box.top - stageBox.top,
            left: box.left - stageBox.left,
            width: box.width,
            height: box.height,
          }
        })
      const htmlFooter = await footerBox()
      await page.goto(`/?deck=${deckId}&page=2`)
      await expect(
        stage.getByRole("heading", { name: "Continue the pilot" })
      ).toBeVisible()
      await fitAtCaptureSize(page)
      expect(await footerBox()).toEqual(htmlFooter)
    })
  }
}
