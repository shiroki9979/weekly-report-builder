import { describe, expect, it } from "vitest"

import { buildStackedBarSegments } from "@/lib/chart-stack"

describe("buildStackedBarSegments", () => {
  it("computes stacked bar segment heights as percentages of each category total", () => {
    const segments = buildStackedBarSegments({
      categories: ["Mon", "Tue"],
      series: [
        { name: "Alpha", color: "#2e75b6", values: [2, 4] },
        { name: "Beta", color: "#7eb0d6", values: [8, 6] },
      ],
    })

    expect(segments).toEqual([
      {
        category: "Mon",
        bars: [
          { name: "Alpha", color: "#2e75b6", heightPercent: 20 },
          { name: "Beta", color: "#7eb0d6", heightPercent: 80 },
        ],
      },
      {
        category: "Tue",
        bars: [
          { name: "Alpha", color: "#2e75b6", heightPercent: 40 },
          { name: "Beta", color: "#7eb0d6", heightPercent: 60 },
        ],
      },
    ])
  })
})
