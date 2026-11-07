import { expect, test } from "@playwright/test"
import { resetE2eDecks } from "./decks-reset"
import { fitAtCaptureSize } from "./stage-capture"

test.beforeEach(() => resetE2eDecks())

// 溢出量測只看內容是否超出 1280 × 720；本文若能縮到內容高度以下，
// 內容會蓋住頁尾卻仍判定為 fit，所以逐步加長同一段文字檢查這個不變式
const GROWTH_STEP = "More fictional pilot detail to review. "
const MAX_GROWTH_STEPS = 160

const layouts = [
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
