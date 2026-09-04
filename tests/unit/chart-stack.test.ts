import { describe, expect, it } from "vitest"

import { buildStackedBarSegments } from "@/lib/chart-stack"

describe("buildStackedBarSegments", () => {
  it("scales stacked segment heights against the largest category total", () => {
    const segments = buildStackedBarSegments({
      categories: ["Mon", "Tue"],
      series: [
        { name: "Alpha", color: "#2e75b6", values: [2, 4] },
        { name: "Beta", color: "#7eb0d6", values: [8, 16] },
      ],
    })

    // Mon total 10, Tue total 20 → scale 20
    expect(segments).toEqual([
      {
        category: "Mon",
        bars: [
          { name: "Alpha", color: "#2e75b6", heightPercent: 10 },
          { name: "Beta", color: "#7eb0d6", heightPercent: 40 },
        ],
      },
      {
        category: "Tue",
        bars: [
          { name: "Alpha", color: "#2e75b6", heightPercent: 20 },
          { name: "Beta", color: "#7eb0d6", heightPercent: 80 },
        ],
      },
    ])
  })

  it("compares single-series values across categories instead of filling every column", () => {
    const segments = buildStackedBarSegments({
      categories: ["日照", "濕度"],
      series: [{ name: "|r|", color: "#2e75b6", values: [0.702, 0.556] }],
    })

    expect(segments[0].bars[0].heightPercent).toBe(100)
    expect(segments[1].bars[0].heightPercent).toBe(79.2)
  })
})
