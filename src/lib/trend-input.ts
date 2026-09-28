import {
  observationIndex,
  observationPath,
  pageInputs,
  readInputText,
  type MetricInputMap,
  type PageInputLocation,
  type PageMetricInputs,
  type TrendInputPath,
} from "./metric-input"
import { errorMessage } from "./error-message"
import { trendRangeEnd } from "./trend-target"
import { isCalendarMonday } from "./week-id"
import {
  assertCanAddEntry,
  assertCanRemoveEntry,
  canAddEntry,
  canRemoveEntry,
  CARDINALITY,
  type Cardinality,
  hasEnteredObservations,
  isTrendTargetPage,
  type WeeklyObservation,
  type TrendTargetPage,
  type WeekDocument,
} from "./week-document"

export type TrendInputLocation = PageInputLocation<TrendInputPath>

// readiness 以此 path 標記整個週次位置（例如 Unfilled），與該週數值的 Metric Input path 區分
export function observationEntryPath(index: number): string {
  return `observations[${index}]`
}

export type TrendEndpointAction =
  "prepend" | "append" | "remove-first" | "remove-last"

function endpointAddsWeek(action: TrendEndpointAction): boolean {
  return action === "prepend" || action === "append"
}

type EntryGuard = {
  allows: (entries: readonly unknown[], rule: Cardinality) => boolean
  assert: (entries: readonly unknown[], rule: Cardinality) => void
}

// 按鈕可用性與實際增減共用同一組數量規則，UI 允許的操作不會在執行時被拒
const ADD_WEEK: EntryGuard = { allows: canAddEntry, assert: assertCanAddEntry }
const REMOVE_WEEK: EntryGuard = {
  allows: canRemoveEntry,
  assert: assertCanRemoveEntry,
}

function endpointGuard(action: TrendEndpointAction): EntryGuard {
  return endpointAddsWeek(action) ? ADD_WEEK : REMOVE_WEEK
}

export function canChangeTrendEndpoint(
  observations: readonly WeeklyObservation[],
  action: TrendEndpointAction
): boolean {
  return endpointGuard(action).allows(
    observations,
    CARDINALITY.trendObservations
  )
}

export function assertTrendEndpointAllowed(
  observations: readonly WeeklyObservation[],
  action: TrendEndpointAction
): void {
  endpointGuard(action).assert(observations, CARDINALITY.trendObservations)
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
  const current = Object.entries(pageInputs(inputs, pageId))
  if (!current.length) return inputs
  const next: Partial<Record<keyof PageMetricInputs, string>> = {}
  for (const [path, raw] of current) {
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
  const raw = readInputText(inputs, { pageId: page.id, path })
  if (raw === undefined) return null
  if (path === "startMonday") return startMondayInputError(page, raw)
  if (path !== "target" && raw.trim() && !page.startMonday)
    return "Set starting Monday before entering observations"
  const parsed = parseTrendNumber(raw)
  if (parsed === "underflow") return "Number is too small to represent"
  return parsed === "invalid" ? "Enter a finite signed number" : null
}

type TrendDatingError = {
  path: "startMonday" | "observations"
  message: string
}

// 起始週一須是真實週一，且整段區間都能標上 ISO 日期；編輯中的輸入與 readiness 共用同一套檢查
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

function startMondayInputError(
  page: TrendTargetPage,
  raw: string
): string | null {
  const entered = hasEnteredObservations(page.observations)
  if (raw === "" && !entered) return null
  const datingError = trendDatingError(raw, page.observations.length)
  if (datingError) return datingError.message
  if (page.startMonday && raw !== page.startMonday && entered)
    return "Re-dating entered observations requires confirmation"
  return null
}

export function hasInvalidTrendInput(
  page: TrendTargetPage,
  inputs: MetricInputMap
): boolean {
  return Object.keys(pageInputs(inputs, page.id)).some(
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
