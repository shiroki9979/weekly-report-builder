import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import {
  addChartCategory,
  addChartSeries,
  setChartCategory,
  setChartPanelTitle,
  setChartSeriesColor,
  setChartSeriesName,
  setChartSeriesValue,
} from "@/lib/week-editor"
import { parseWeekDocument } from "@/lib/week-document"

const fixturePath = resolve(import.meta.dirname, "../fixtures/chart-week.json")

function loadChartWeek() {
  return parseWeekDocument(JSON.parse(readFileSync(fixturePath, "utf-8")))
}

function chartPanel(week: ReturnType<typeof loadChartWeek>) {
  const panel = week.pages[0].panel
  if (panel.kind !== "chart") {
    throw new Error("expected chart panel")
  }
  return panel
}

describe("chart week-editor", () => {
  it("maps chart category and series edits onto the week document", () => {
    const week = loadChartWeek()
    const withTitle = setChartPanelTitle(week, 0, "Activity this week")
    const withCategory = setChartCategory(withTitle, 0, 0, "Mon")
    const withSeriesName = setChartSeriesName(withCategory, 0, 0, "Team A")
    const withSeriesColor = setChartSeriesColor(withSeriesName, 0, 0, "#112233")
    const withValue = setChartSeriesValue(withSeriesColor, 0, 0, 0, 42)

    const panel = chartPanel(withValue)
    expect(panel.title).toBe("Activity this week")
    expect(panel.categories[0]).toBe("Mon")
    expect(panel.series[0]).toEqual({
      name: "Team A",
      color: "#112233",
      values: [42, 34, 57, 18, 39],
    })
  })

  it("adds categories and series with aligned values", () => {
    const week = loadChartWeek()
    const withCategory = addChartCategory(week, 0)
    const withSeries = addChartSeries(withCategory, 0)

    const panel = chartPanel(withSeries)
    expect(panel.categories).toHaveLength(6)
    expect(panel.categories[5]).toBe("")
    expect(panel.series).toHaveLength(4)
    expect(panel.series[3].values).toHaveLength(6)
    expect(panel.series[3].values.every((value) => value === 0)).toBe(true)
  })
})
