import type { TrendTargetPage } from "./week-document"

const DAYS_PER_WEEK = 7
// 上下各留 10% 空白，避免端點與目標線貼齊圖框
const AXIS_PADDING_RATIO = 0.1
// 所有值相同時沒有自然範圍，至少撐開 1 個單位才畫得出刻度
const FLAT_SERIES_MIN_PADDING = 1

export function isCalendarMonday(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    date.getUTCDay() === 1
  )
}

export function observationMonday(start: string, index: number): string {
  const date = new Date(`${start}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + DAYS_PER_WEEK * index)
  const value = date.toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Trend range exceeds supported ISO dates")
  return value
}

export function trendEndMonday(page: TrendTargetPage): string | null {
  return page.startMonday
    ? observationMonday(page.startMonday, page.observations.length - 1)
    : null
}

// toFixed 會把 -0.04 印成 "-0.0"；投影片與比較邏輯都須以正規化後的字串為準
export function displayedTrendNumber(value: number, precision: number): string {
  const fixed = value.toFixed(precision)
  return Number(fixed) === 0 ? (0).toFixed(precision) : fixed
}

export function formatTrendValue(value: number, page: TrendTargetPage): string {
  return withUnit(displayedTrendNumber(value, page.metric.precision), page)
}

export function exactTrendValue(value: number, page: TrendTargetPage): string {
  return withUnit(Object.is(value, -0) ? "0" : String(value), page)
}

export function formatTrendTarget(page: TrendTargetPage): string | null {
  if (page.target === null) return null
  const operator = page.direction === "at-most" ? "≤" : "≥"
  return `${operator} ${formatTrendValue(page.target, page)}`
}

function withUnit(numeric: string, page: TrendTargetPage): string {
  const { unit, unitPosition, unitSpacing } = page.metric
  if (!unit) return numeric
  const gap = unitSpacing === "space" ? " " : ""
  return unitPosition === "before"
    ? `${unit}${gap}${numeric}`
    : `${numeric}${gap}${unit}`
}

export function targetMet(value: number, page: TrendTargetPage): boolean {
  if (page.target === null) return false
  return page.direction === "at-most"
    ? value <= page.target
    : value >= page.target
}

export function trendBounds(page: TrendTargetPage): [number, number] {
  const values = page.observations.flatMap((entry) =>
    entry.state === "measured" ? [entry.value] : []
  )
  if (page.target !== null) values.push(page.target)
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error("Trend values must be finite")
  }
  if (!values.length) return [-1, 1]
  const low = Math.min(...values)
  const high = Math.max(...values)
  const pad =
    high === low
      ? Math.max(Math.abs(low) * AXIS_PADDING_RATIO, FLAT_SERIES_MIN_PADDING)
      : (high - low) * AXIS_PADDING_RATIO
  const minimum = low - pad
  const maximum = high + pad
  if (
    !Number.isFinite(minimum) ||
    !Number.isFinite(maximum) ||
    !Number.isFinite(maximum - minimum) ||
    minimum >= maximum
  ) {
    throw new Error("Trend axis cannot represent these values")
  }
  return [minimum, maximum]
}
