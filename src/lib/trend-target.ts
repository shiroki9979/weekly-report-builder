import type { TrendTargetPage } from "./week-document"

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
  date.setUTCDate(date.getUTCDate() + 7 * index)
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

export function formatTrendValue(value: number, page: TrendTargetPage): string {
  const { precision, unit, unitPosition, unitSpacing } = page.metric
  const fixed = value.toFixed(precision)
  const numeric = Number(fixed) === 0 ? (0).toFixed(precision) : fixed
  if (!unit) return numeric
  const gap = unitSpacing === "space" ? " " : ""
  return unitPosition === "before"
    ? `${unit}${gap}${numeric}`
    : `${numeric}${gap}${unit}`
}

export function exactTrendValue(value: number, page: TrendTargetPage): string {
  const { unit, unitPosition, unitSpacing } = page.metric
  const numeric = Object.is(value, -0) ? "0" : String(value)
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
    high === low ? Math.max(Math.abs(low) * 0.1, 1) : (high - low) * 0.1
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
