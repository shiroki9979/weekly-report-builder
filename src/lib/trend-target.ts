import type { TrendTargetPage, UnmeasuredState } from "./week-document"
import { errorMessage } from "./error-message"
import { withUnit } from "./unit-format"
import { isCalendarMonday, isMondayId } from "./week-id"

const DAYS_PER_WEEK = 7
// 上下各留 10% 空白，避免端點與目標線貼齊圖框
const AXIS_PADDING_RATIO = 0.1
// 所有值相同時沒有自然範圍，至少撐開 1 個單位才畫得出刻度
const FLAT_SERIES_MIN_PADDING = 1

export function observationMonday(start: string, index: number): string {
  const date = new Date(`${start}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + DAYS_PER_WEEK * index)
  const value = date.toISOString().slice(0, 10)
  // 超出四位數年份時 toISOString 會改用 ±YYYYYY 格式，不再是合法的週一 id
  if (!isMondayId(value))
    throw new Error("Trend range exceeds supported ISO dates")
  return value
}

// 超出 ISO 日期範圍時拋錯，呼叫端可藉此驗證整段區間都能標日期
export function trendRangeEnd(start: string, length: number): string {
  return observationMonday(start, length - 1)
}

function trendRangeError(start: string, length: number): string | null {
  try {
    trendRangeEnd(start, length)
    return null
  } catch (cause) {
    return errorMessage(cause, "Trend range cannot be dated")
  }
}

type TrendDatingError = {
  path: "startMonday" | "observations"
  message: string
}

// 起始週一須是真實週一，且整段區間都能標上 ISO 日期；parser、編輯中的輸入與 readiness 共用同一套檢查
export function trendDatingError(
  start: string,
  length: number
): TrendDatingError | null {
  if (!isCalendarMonday(start))
    return {
      path: "startMonday",
      message: "Starting Monday must be a real calendar Monday",
    }
  const rangeError = trendRangeError(start, length)
  return rangeError ? { path: "observations", message: rangeError } : null
}

export function trendEndMonday(page: TrendTargetPage): string | null {
  return page.startMonday
    ? trendRangeEnd(page.startMonday, page.observations.length)
    : null
}

// toFixed 會把 -0.04 印成 "-0.0"；投影片與比較邏輯都須以正規化後的字串為準
export function displayedTrendNumber(value: number, precision: number): string {
  const fixed = value.toFixed(precision)
  return Number(fixed) === 0 ? (0).toFixed(precision) : fixed
}

export function formatTrendValue(value: number, page: TrendTargetPage): string {
  return withUnit(
    displayedTrendNumber(value, page.metric.precision),
    page.metric
  )
}

export function exactTrendValue(value: number, page: TrendTargetPage): string {
  return withUnit(Object.is(value, -0) ? "0" : String(value), page.metric)
}

// 未量測週次的文案依規格集中於此，投影片與編輯器共用：Missing 在圖上、描述與編輯器稱
// No observation，作為最新週時摘要改稱 No data；Unfilled 一律為 Not entered
export const UNMEASURED_COPY: Record<
  UnmeasuredState,
  { observation: string; latestStatus: string }
> = {
  missing: { observation: "No observation", latestStatus: "No data" },
  unfilled: { observation: "Not entered", latestStatus: "Not entered" },
}

export const TARGET_NOT_SET = "Target not set"

type TrendDirection = TrendTargetPage["direction"]

type TrendDirectionRule = {
  operator: string
  choiceLabel: string
  preference: string
  meets: (value: number, target: number) => boolean
}

// 目標方向的符號、比較與文案集中一處，parser、編輯器與投影片不各自判斷方向
const TREND_DIRECTION_RULES: Record<TrendDirection, TrendDirectionRule> = {
  "at-most": {
    operator: "≤",
    choiceLabel: "At most (≤)",
    preference: "Lower is better",
    meets: (value, target) => value <= target,
  },
  "at-least": {
    operator: "≥",
    choiceLabel: "At least (≥)",
    preference: "Higher is better",
    meets: (value, target) => value >= target,
  },
}

export const TREND_DIRECTIONS = Object.keys(
  TREND_DIRECTION_RULES
) as TrendDirection[]

export function isTrendDirection(value: unknown): value is TrendDirection {
  return (
    typeof value === "string" && Object.hasOwn(TREND_DIRECTION_RULES, value)
  )
}

export function trendDirectionRule(
  direction: TrendDirection
): TrendDirectionRule {
  return TREND_DIRECTION_RULES[direction]
}

export function formatTrendTarget(page: TrendTargetPage): string | null {
  if (page.target === null) return null
  const { operator } = trendDirectionRule(page.direction)
  return `${operator} ${formatTrendValue(page.target, page)}`
}

export function targetMet(value: number, page: TrendTargetPage): boolean {
  if (page.target === null) return false
  return trendDirectionRule(page.direction).meets(value, page.target)
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
  const idealPad =
    high === low
      ? Math.max(Math.abs(low) * AXIS_PADDING_RATIO, FLAT_SERIES_MIN_PADDING)
      : (high - low) * AXIS_PADDING_RATIO
  // 極小的有限跨度乘以 10% 可能下溢為零；至少保留一個可表示的間距。
  const pad = Math.max(idealPad, Number.MIN_VALUE)
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
