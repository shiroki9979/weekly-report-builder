import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StageSlide } from "@/components/stage/stage-slide"
import type { TrendTargetPage } from "@/lib/deck"

// 投影片 SVG 以字面色碼繪製（html-to-image 不帶 var()），須與 stage token 保持一致
function cssToken(stylesheet: string, token: string): string {
  const css = readFileSync(
    resolve(import.meta.dirname, "../../src/styles", stylesheet),
    "utf8"
  )
  const match = new RegExp(`--${token}:\\s*(#[0-9a-fA-F]+)`).exec(css)
  if (!match) throw new Error(`Missing --${token} in ${stylesheet}`)
  return match[1].toLowerCase()
}

const page: TrendTargetPage = {
  id: "p01",
  layout: "trend-target",
  title: "Exports recovered.",
  metric: {
    label: "Mean export duration",
    unit: "s",
    unitPosition: "after",
    unitSpacing: "space",
    precision: 1,
  },
  cadence: "week",
  start: "2026-07-06",
  observations: [
    { state: "measured", value: 9.2 },
    { state: "missing" },
    { state: "measured", value: 8.04 },
  ],
  target: 8,
  direction: "at-most",
  interpretation: "Recent work reduced export time.",
  measurementContext: "p95 exports.",
}

describe("Trend & Target SVG ink", () => {
  it.each([
    { mark: "grid", attribute: "stroke", sheet: "stage.css", token: "line" },
    { mark: "axis", attribute: "fill", sheet: "stage.css", token: "mute" },
    { mark: "line", attribute: "stroke", sheet: "stage.css", token: "blue" },
    { mark: "point", attribute: "fill", sheet: "stage.css", token: "blue" },
    { mark: "point", attribute: "stroke", sheet: "stage.css", token: "paper" },
    {
      mark: "target",
      attribute: "stroke",
      sheet: "editorial-layouts.css",
      token: "warn-ink",
    },
    // 缺測標記與目標線分色，目標貼近 y 軸下限時 × 疊在虛線上也不會被讀成「等於目標」
    { mark: "missing", attribute: "fill", sheet: "stage.css", token: "mute" },
  ])(
    "paints the $mark $attribute with --$token",
    ({ mark, attribute, sheet, token }) => {
      const { container } = render(
        <StageSlide
          page={page}
          context={{
            documentId: "2026-07-20",
            frameLabel: "2026-07-20",
            pageLabel: "",
            showPageNumber: false,
          }}
        />
      )

      const element = container.querySelector(`svg .editorial-trend-${mark}`)

      expect(element?.getAttribute(attribute)?.toLowerCase()).toBe(
        cssToken(sheet, token)
      )
    }
  )
})
