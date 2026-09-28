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
import type { MetricInputResult } from "./metric-format"
import { trendDatingError } from "./trend-target"
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

export function startMondayInput(pageId: string): TrendInputLocation {
  return { pageId, path: "startMonday" }
}

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

const SIGNED_DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/

// 與 Comparison Metric 的 parseMetricInput 回傳同一種結果形狀，呼叫端以 status 分辨
export function parseTrendNumber(raw: string): MetricInputResult {
  const text = raw.trim()
  if (!text) return { status: "empty", value: null }
  const value = Number(text)
  if (!SIGNED_DECIMAL.test(text) || !Number.isFinite(value))
    return { status: "invalid", message: "Enter a finite signed number" }
  // 非零係數若下溢成 0，會把量測誤存為真正的零值。
  if (value === 0 && /[1-9]/.test(text.split(/[eE]/, 1)[0]))
    return { status: "invalid", message: "Number is too small to represent" }
  return { status: "valid", value }
}

// 呼叫端須先通過 trendInputError；非法 Metric Input 走到這裡代表流程有誤，須拋錯而非寫入 JSON
export function requireTrendNumber(raw: string): number | null {
  const parsed = parseTrendNumber(raw)
  if (parsed.status === "invalid")
    throw new Error(`Invalid Trend number: ${raw}`)
  return parsed.value
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
  return parsed.status === "invalid" ? parsed.message : null
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
