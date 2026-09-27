import type { MetricInputMap, TrendInputPath } from "./metric-input"
import { isCalendarMonday, observationMonday } from "./trend-target"
import type { TrendTargetPage } from "./week-document"

export type TrendInputLocation = { pageId: string; path: TrendInputPath }

export function readTrendInputText(
  inputs: MetricInputMap,
  location: TrendInputLocation
): string | undefined {
  return inputs[location.pageId]?.[location.path]
}

export function writeTrendInputText(
  inputs: MetricInputMap,
  location: TrendInputLocation,
  raw: string
): MetricInputMap {
  return {
    ...inputs,
    [location.pageId]: { ...inputs[location.pageId], [location.path]: raw },
  }
}

export function parseTrendNumber(raw: string): number | null | "invalid" {
  const text = raw.trim()
  if (!text) return null
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text))
    return "invalid"
  const value = Number(text)
  return Number.isFinite(value) ? value : "invalid"
}

export function trendInputError(
  page: TrendTargetPage,
  inputs: MetricInputMap,
  path: TrendInputPath
): string | null {
  const raw = inputs[page.id]?.[path]
  if (raw === undefined) return null
  if (path === "startMonday") {
    if (
      raw === "" &&
      page.observations.every((entry) => entry.state === "unfilled")
    )
      return null
    if (!isCalendarMonday(raw))
      return "Starting Monday must be a real calendar Monday"
    try {
      observationMonday(raw, page.observations.length - 1)
    } catch {
      return "Trend range exceeds supported ISO dates"
    }
    if (
      page.startMonday &&
      raw !== page.startMonday &&
      page.observations.some((entry) => entry.state !== "unfilled")
    ) {
      return "Re-dating entered observations requires confirmation"
    }
    return null
  }
  if (path.startsWith("observations[") && raw.trim() && !page.startMonday)
    return "Set starting Monday before entering observations"
  return parseTrendNumber(raw) === "invalid"
    ? "Enter a finite signed number"
    : null
}

export function hasInvalidTrendInput(
  page: TrendTargetPage,
  inputs: MetricInputMap
): boolean {
  const pageInputs = inputs[page.id]
  return (
    !!pageInputs &&
    Object.keys(pageInputs).some(
      (path) =>
        (path === "target" ||
          path === "startMonday" ||
          /^observations\[\d+\]\.value$/.test(path)) &&
        trendInputError(page, inputs, path as TrendInputPath) !== null
    )
  )
}
