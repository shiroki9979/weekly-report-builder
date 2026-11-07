import type { ChartPanel } from "./deck"

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

const CHART_SERIES_ROLE_COUNT = 5

export function resolveSeriesColor(
  color: string | undefined,
  seriesIndex: number
): string {
  return color && color.trim() !== ""
    ? color
    : `var(--chart-${(seriesIndex % CHART_SERIES_ROLE_COUNT) + 1})`
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100
}

function categoryTotal(chart: ChartStackInput, categoryIndex: number): number {
  return chart.series.reduce((sum, series) => {
    const value = series.values[categoryIndex] ?? 0
    return sum + Math.max(value, 0)
  }, 0)
}

export function buildStackedBarSegments(
  chart: ChartStackInput
): ChartCategoryStack[] {
  const scale = chart.categories.reduce(
    (maxTotal, _category, categoryIndex) => {
      return Math.max(maxTotal, categoryTotal(chart, categoryIndex))
    },
    0
  )

  return chart.categories.map((category, categoryIndex) => {
    const bars = chart.series.map((series, seriesIndex) => {
      const value = Math.max(series.values[categoryIndex] ?? 0, 0)
      const heightPercent = scale > 0 ? roundPercent((value / scale) * 100) : 0

      return {
        name: series.name,
        color: resolveSeriesColor(series.color, seriesIndex),
        heightPercent,
      }
    })

    return { category, bars }
  })
}
