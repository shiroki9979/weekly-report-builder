import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ChartPanelView } from "@/components/stage/panels/chart-panel"
import type { ChartPanel } from "@/lib/week-document"

const samplePanel: ChartPanel = {
  kind: "chart",
  title: "Commits this week",
  categories: ["24", "25"],
  series: [
    { name: "Platform", color: "#2e75b6", values: [16, 34] },
    { name: "SolarDB", color: "#7eb0d6", values: [27, 23] },
  ],
}

describe("ChartPanelView", () => {
  it("renders a stacked bar chart from categories and series", () => {
    render(<ChartPanelView panel={samplePanel} />)

    expect(screen.getByText("Commits this week")).toBeInTheDocument()
    expect(screen.getByText("Platform")).toBeInTheDocument()
    expect(screen.getByText("SolarDB")).toBeInTheDocument()
    expect(screen.getByText("24")).toBeInTheDocument()
    expect(screen.getByText("25")).toBeInTheDocument()

    const bars = screen.getAllByTestId("chart-bar-segment")
    expect(bars).toHaveLength(4)
    expect(bars[0]).toHaveStyle({ height: "37.21%" })
    expect(bars[1]).toHaveStyle({ height: "62.79%" })
  })
})
