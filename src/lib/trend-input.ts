import type {
  MetricInputMap,
  ObservationInputPath,
  PageMetricInputs,
  TrendInputPath,
} from "./metric-input"
import { errorMessage } from "./error-message"
import { trendRangeEnd } from "./trend-target"
import { isCalendarMonday } from "./week-id"
import {
  canAddEntry,
  canRemoveEntry,
  CARDINALITY,
  hasEnteredObservations,
  isTrendTargetPage,
  type WeeklyObservation,
  type TrendTargetPage,
  type WeekDocument,
} from "./week-document"

export type TrendInputLocation = { pageId: string; path: TrendInputPath }

export type TrendEndpointAction =
  "prepend" | "append" | "remove-first" | "remove-last"

const OBSERVATION_PATH = /^observations\[(\d+)\]\.value$/

export function endpointAddsWeek(action: TrendEndpointAction): boolean {
  return action === "prepend" || action === "append"
}

export function canChangeTrendEndpoint(
  observations: readonly WeeklyObservation[],
  action: TrendEndpointAction
): boolean {
  const rule = CARDINALITY.trendObservations
  return endpointAddsWeek(action)
    ? canAddEntry(observations, rule)
    : canRemoveEntry(observations, rule)
}

export function observationPath(index: number): ObservationInputPath {
  return `observations[${index}].value`
}

export function observationIndex(path: string): number | null {
  const match = OBSERVATION_PATH.exec(path)
  return match ? Number(match[1]) : null
}

function isTrendInputPath(path: string): path is TrendInputPath {
  return (
    path === "target" ||
    path === "startMonday" ||
    observationIndex(path) !== null
  )
}

// null 代表該週已被移除，對應的 Metric Input 一併丟棄
const SHIFTED_INDEX: Record<
  TrendEndpointAction,
  (index: number, length: number) => number | null
> = {
  prepend: (index) => index + 1,
  append: (index) => index,
  "remove-first": (index) => (index === 0 ? null : index - 1),
  "remove-last": (index, length) => (index === length - 1 ? null : index),
}

// 端點增減只改 observations 索引；非法 Metric Input 須跟著搬到同一週，否則錯誤會掛到鄰週
export function remapTrendObservationInput(
  inputs: MetricInputMap,
  pageId: string,
  { action, length }: { action: TrendEndpointAction; length: number }
): MetricInputMap {
  const pageInputs = inputs[pageId]
  if (!pageInputs) return inputs
  const next: Partial<Record<keyof PageMetricInputs, string>> = {}
  for (const [path, raw] of Object.entries(pageInputs)) {
    const index = observationIndex(path)
    if (index === null) {
      next[path as keyof PageMetricInputs] = raw
      continue
    }
    const shifted = SHIFTED_INDEX[action](index, length)
    if (shifted !== null) next[observationPath(shifted)] = raw
  }
  return { ...inputs, [pageId]: next }
}

export function parseTrendNumber(
  raw: string
): number | null | "invalid" | "underflow" {
  const text = raw.trim()
  if (!text) return null
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text))
    return "invalid"
  const value = Number(text)
  if (!Number.isFinite(value)) return "invalid"
  // 非零係數若下溢成 0，會把量測誤存為真正的零值。
  if (value === 0 && /[1-9]/.test(text.split(/[eE]/, 1)[0])) return "underflow"
  return value
}

// 呼叫端須先通過 trendInputError；非法 Metric Input 走到這裡代表流程有誤，須拋錯而非寫入 JSON
export function requireTrendNumber(raw: string): number | null {
  const value = parseTrendNumber(raw)
  if (typeof value === "string") throw new Error(`Invalid Trend number: ${raw}`)
  return value
}

// 起始週一已提交且沒有待確認的改動時，端點增減與觀測值才有明確日期可掛
export function isStartSettled(
  page: TrendTargetPage,
  pendingStart: string | undefined
): page is TrendTargetPage & { startMonday: string } {
  return (
    page.startMonday !== null &&
    (pendingStart === undefined || pendingStart === page.startMonday)
  )
}

export function trendRangeError(start: string, length: number): string | null {
  try {
    trendRangeEnd(start, length)
    return null
  } catch (cause) {
    return errorMessage(cause, "Trend range cannot be dated")
  }
}

export function trendInputError(
  page: TrendTargetPage,
  inputs: MetricInputMap,
  path: TrendInputPath
): string | null {
  const raw = inputs[page.id]?.[path]
  if (raw === undefined) return null
  if (path === "startMonday") return startMondayInputError(page, raw)
  if (path !== "target" && raw.trim() && !page.startMonday)
    return "Set starting Monday before entering observations"
  const parsed = parseTrendNumber(raw)
  if (parsed === "underflow") return "Number is too small to represent"
  return parsed === "invalid" ? "Enter a finite signed number" : null
}

function startMondayInputError(
  page: TrendTargetPage,
  raw: string
): string | null {
  const entered = hasEnteredObservations(page.observations)
  if (raw === "" && !entered) return null
  if (!isCalendarMonday(raw))
    return "Starting Monday must be a real calendar Monday"
  const rangeError = trendRangeError(raw, page.observations.length)
  if (rangeError) return rangeError
  if (page.startMonday && raw !== page.startMonday && entered)
    return "Re-dating entered observations requires confirmation"
  return null
}

export function hasInvalidTrendInput(
  page: TrendTargetPage,
  inputs: MetricInputMap
): boolean {
  return Object.keys(inputs[page.id] ?? {}).some(
    (path) =>
      isTrendInputPath(path) && trendInputError(page, inputs, path) !== null
  )
}

export function weekHasInvalidTrendInputs(
  week: WeekDocument,
  inputs: MetricInputMap
): boolean {
  return week.pages.some(
    (page) => isTrendTargetPage(page) && hasInvalidTrendInput(page, inputs)
  )
}
