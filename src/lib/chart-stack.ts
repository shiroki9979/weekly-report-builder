import type { ChartPanel } from "./week-document"

export type ChartStackInput = Pick<ChartPanel, "categories" | "series">

export type ChartBarSegment = {
  name: string
  color: string
  heightPercent: number
}

export type ChartCategoryStack = {
  category: string
  bars: ChartBarSegment[]
}

const DEFAULT_SERIES_COLORS = ["#2e75b6", "#7eb0d6", "#c5d9ed", "#1f5a8f", "#5c5c5c"]

function resolveSeriesColor(color: string | undefined, seriesIndex: number): string {
  if (color && color.trim() !== "") {
    return color
  }

  return DEFAULT_SERIES_COLORS[seriesIndex % DEFAULT_SERIES_COLORS.length]
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100
}

export function buildStackedBarSegments(
  chart: ChartStackInput
): ChartCategoryStack[] {
  return chart.categories.map((category, categoryIndex) => {
    const rawValues = chart.series.map(
      (series) => series.values[categoryIndex] ?? 0
    )
    const total = rawValues.reduce((sum, value) => sum + Math.max(value, 0), 0)

    const bars = chart.series.map((series, seriesIndex) => {
      const value = Math.max(series.values[categoryIndex] ?? 0, 0)
      const heightPercent =
        total > 0 ? roundPercent((value / total) * 100) : 0

      return {
        name: series.name,
        color: resolveSeriesColor(series.color, seriesIndex),
        heightPercent,
      }
    })

    return { category, bars }
  })
}
