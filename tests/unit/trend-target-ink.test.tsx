import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { StageSlide } from "@/components/stage/stage-slide"
import { createStagePageContext } from "@/lib/stage-page-context"
import type { DeckTheme, TrendTargetPage } from "@/lib/deck"

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

describe("Trend & Target theme ink", () => {
  const style = document.createElement("style")
  afterEach(() => style.remove())

  it("resolves Stage colour roles into capture-safe SVG attributes when the theme changes", () => {
    // jsdom 不繼承 custom properties；直接提供繪圖元素可讀的瀏覽器邊界值。
    style.textContent =
      "div { --line: #d0d7de; --mute: #5c5c5c; --accent: #2e75b6; --warn-ink: #8a5508; --paper: #ffffff; }"
    document.head.append(style)
    const slide = (theme: DeckTheme) => (
      <StageSlide
        page={page}
        context={createStagePageContext(
          "harbor",
          { theme, pages: [page] },
          page.id
        )}
      />
    )
    const { rerender } = render(slide("default"))
    const chart = screen.getByRole("img")
    expect(chart.querySelector("path")).toHaveAttribute("stroke", "#2e75b6")
    expect(chart.querySelector("circle")).toHaveAttribute("fill", "#2e75b6")
    expect(chart.querySelector("circle")).toHaveAttribute("stroke", "#ffffff")

    style.textContent =
      "div { --line: #d6dee4; --mute: #5a6e7e; --accent: #287b78; --warn-ink: #8a5508; --paper: #ffffff; }"
    rerender(slide("observatory"))
    expect(chart.querySelector("path")).toHaveAttribute("stroke", "#287b78")
    expect(chart.querySelector("circle")).toHaveAttribute("fill", "#287b78")
    expect(chart.querySelector("line")).toHaveAttribute("stroke", "#d6dee4")
    expect(chart.querySelector("text")).toHaveAttribute("fill", "#5a6e7e")
    expect(screen.getByLabelText("No observation")).toHaveAttribute(
      "fill",
      "#5a6e7e"
    )
  })

  it("resolves capture-safe ink once a chart recovers from an unrepresentable axis", () => {
    style.textContent =
      "div { --line: #d0d7de; --mute: #5c5c5c; --accent: #2e75b6; --warn-ink: #8a5508; --paper: #ffffff; }"
    document.head.append(style)
    const slide = (trend: TrendTargetPage) => (
      <StageSlide
        page={trend}
        context={createStagePageContext("harbor", { pages: [trend] }, trend.id)}
      />
    )
    const unrepresentable: TrendTargetPage = {
      ...page,
      observations: [
        { state: "measured", value: -Number.MAX_VALUE },
        { state: "measured", value: Number.MAX_VALUE },
      ],
    }
    const { rerender } = render(slide(unrepresentable))
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Trend axis cannot represent these values"
    )

    rerender(slide(page))

    const chart = screen.getByRole("img")
    expect(chart.querySelector("path")).toHaveAttribute("stroke", "#2e75b6")
  })
})
