import { assessContentReadiness, type ExportIssue } from "./export-readiness"
import {
  METRIC_VALUE_FIELDS,
  readMetricInputText,
  remapMetricInputAfterMove,
  remapMetricInputAfterRemove,
  weekHasInvalidMetricInputs,
  writeMetricInputText,
  type MetricInputLocation,
  type MetricInputMap,
  type MetricLocation,
  type MetricMove,
} from "./metric-input"
import { parseMetricInput } from "./metric-format"
import { weekHasInvalidTrendInputs } from "./trend-input"
import {
  addPageAfter,
  deleteSelectedPage,
  moveSelectedPage,
  type PageMoveDirection,
} from "./page-lifecycle"
import {
  addDecisionMetric,
  moveDecisionMetric,
  removeDecisionMetric,
  setDecisionMetricValue,
} from "./evidence-decision-editor"
import {
  isEvidenceDecisionPage,
  isTrendTargetPage,
  isStructuredWeekPage,
  type ComparisonMetric,
  type WeekDocument,
  type WeekPage,
} from "./week-document"

export type EditingSession = {
  readonly weeks: string[]
  readonly selectedMonday: string
  readonly loadStatus: SessionLoadStatus
  readonly week: WeekDocument | null
  readonly metricInput: MetricInputMap
  readonly selectedPageId: string | null
  readonly saveError: string | null
  readonly saving: boolean
  readonly savedMessage: string | null
  readonly creating: boolean
  readonly createError: string | null
}

// 快照在執行期深度凍結；匯出流程沿用 WeekDocument 型別，誤寫會直接拋錯而不會改到快照
export type SessionOperationSnapshot = Readonly<{
  monday: string
  week: WeekDocument
  selectedPageId: string | null
  metricInput: MetricInputMap
}>

function freezeDeep<T extends object>(value: T): T {
  Object.freeze(value)
  for (const nested of Object.values(value)) {
    if (nested && typeof nested === "object") freezeDeep(nested)
  }
  return value
}

export function sessionOperationSnapshot(
  session: EditingSession
): SessionOperationSnapshot | null {
  if (!session.week || session.loadStatus.kind !== "ready") return null
  return freezeDeep({
    monday: session.selectedMonday,
    week: structuredClone(session.week),
    selectedPageId: session.selectedPageId,
    metricInput: structuredClone(session.metricInput),
  })
}

export type MetricEditorControls = {
  read: (location: MetricInputLocation) => string
  write: (location: MetricInputLocation, raw: string) => void
  add: (pageId: string) => void
  move: (move: MetricMove) => void
  remove: (metric: MetricLocation) => void
  readiness: (pageId: string) => ExportIssue[]
}

export type SessionLoadStatus =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "ready" }

export function createEditingSession(
  week: WeekDocument | null = null
): EditingSession {
  return {
    weeks: [],
    selectedMonday: week?.start ?? "",
    loadStatus: week ? { kind: "ready" } : { kind: "loading" },
    week,
    metricInput: {},
    selectedPageId: week?.pages[0]?.id ?? null,
    saveError: null,
    saving: false,
    savedMessage: null,
    creating: false,
    createError: null,
  }
}

export function openSessionWeek(
  session: EditingSession,
  week: WeekDocument | null
): EditingSession {
  return {
    ...createEditingSession(week),
    weeks: session.weeks,
    selectedMonday: week?.start ?? session.selectedMonday,
  }
}

export function beginSessionOpen(
  session: EditingSession,
  monday: string
): EditingSession {
  return {
    ...openSessionWeek(session, null),
    selectedMonday: monday,
    loadStatus: { kind: "loading" },
  }
}

export function finishSessionOpen(
  session: EditingSession,
  week: WeekDocument
): EditingSession {
  return { ...openSessionWeek(session, week), loadStatus: { kind: "ready" } }
}

export function failSessionOpen(
  session: EditingSession,
  message: string
): EditingSession {
  return {
    ...openSessionWeek(session, null),
    loadStatus: { kind: "error", message },
  }
}

export function setSessionWeeks(
  session: EditingSession,
  weeks: string[]
): EditingSession {
  return {
    ...session,
    weeks,
    loadStatus: weeks.length ? session.loadStatus : { kind: "empty" },
  }
}

export function beginSessionSave(session: EditingSession): EditingSession {
  return {
    ...session,
    saving: true,
    saveError: null,
    savedMessage: null,
  }
}

export function finishSessionSave(session: EditingSession): EditingSession {
  return { ...session, saving: false, savedMessage: "Saved" }
}

export function failSessionSave(
  session: EditingSession,
  message: string
): EditingSession {
  return { ...session, saving: false, saveError: message }
}

export function beginSessionCreate(session: EditingSession): EditingSession {
  return {
    ...session,
    creating: true,
    createError: null,
    savedMessage: null,
  }
}

export function failSessionCreate(
  session: EditingSession,
  message: string
): EditingSession {
  return { ...session, creating: false, createError: message }
}

export function requireWeek(session: EditingSession): WeekDocument {
  if (!session.week) {
    throw new Error("No week is open")
  }
  return session.week
}

// 以 Page ID 找出特定版型的頁面；版型不符視同找不到，呼叫端再依自身語意回報錯誤
export function findSessionPage<T extends WeekPage>(
  session: EditingSession,
  pageId: string,
  hasLayout: (page: WeekPage) => page is T
): { week: WeekDocument; pageIndex: number; page: T } | null {
  const week = requireWeek(session)
  const pageIndex = week.pages.findIndex((page) => page.id === pageId)
  const page = week.pages[pageIndex]
  if (!page || !hasLayout(page)) return null
  return { week, pageIndex, page }
}

function requireMetric(
  session: EditingSession,
  { pageId, metricIndex }: MetricLocation
) {
  const found = findSessionPage(session, pageId, isEvidenceDecisionPage)
  if (!found?.page.metrics[metricIndex]) {
    throw new Error(`Unknown Comparison Metric: ${pageId}[${metricIndex}]`)
  }
  return found
}

export function editSessionContent(
  session: EditingSession,
  update: (week: WeekDocument) => WeekDocument
): EditingSession {
  // 用凍結副本作比較基準，避免回呼原地修改時連傳入的 Session 一起改掉。
  const baseline = freezeDeep(structuredClone(requireWeek(session)))
  const next = update(baseline)
  if (changesPageStructure(baseline, next)) {
    throw new Error(
      "Page changes require a dedicated Editing Session operation"
    )
  }
  if (changesTrendRange(baseline, next)) {
    throw new Error(
      "Trend range changes require a dedicated Editing Session operation"
    )
  }
  if (changesMetricsUnsafely(baseline, next)) {
    throw new Error(
      "Metric changes require a dedicated Editing Session operation"
    )
  }
  return { ...session, week: next }
}

function changesTrendRange(before: WeekDocument, after: WeekDocument): boolean {
  return after.pages.some((afterPage, index) => {
    const beforePage = before.pages[index]
    return (
      isTrendTargetPage(beforePage) &&
      isTrendTargetPage(afterPage) &&
      beforePage.observations.length !== afterPage.observations.length
    )
  })
}

function changesPageStructure(
  before: WeekDocument,
  after: WeekDocument
): boolean {
  return (
    after.pages.length !== before.pages.length ||
    after.pages.some(
      (page, index) =>
        page.id !== before.pages[index].id ||
        page.layout !== before.pages[index].layout
    )
  )
}

function changesMetricsUnsafely(
  before: WeekDocument,
  after: WeekDocument
): boolean {
  return after.pages.some((afterPage, pageIndex) => {
    const beforePage = before.pages[pageIndex]
    return (
      isEvidenceDecisionPage(beforePage) &&
      isEvidenceDecisionPage(afterPage) &&
      hasUnsafeMetricChange(beforePage.metrics, afterPage.metrics)
    )
  })
}

// Metric Input 以 Metric 索引定位；數量變更只能走專用操作，避免複製後的前插與尾加無法區分。
function hasUnsafeMetricChange(
  before: ComparisonMetric[],
  after: ComparisonMetric[]
): boolean {
  return (
    before.length !== after.length ||
    reordersMetrics(before, after) ||
    changesSeveralMetrics(before, after) ||
    changesMetricValues(before, after)
  )
}

function reordersMetrics(
  before: ComparisonMetric[],
  after: ComparisonMetric[]
): boolean {
  return after.some((metric, index) => {
    const beforeIndex = before.indexOf(metric)
    return beforeIndex !== -1 && beforeIndex !== index
  })
}

// Page updater 會複製整份文件，參照比對抓不到複製後的對調；以欄位差異辨識一次改動多個既有 Metric
function changesSeveralMetrics(
  before: ComparisonMetric[],
  after: ComparisonMetric[]
): boolean {
  return (
    before.filter((metric, index) => metricChanged(metric, after[index]))
      .length > 1
  )
}

function metricChanged(
  before: ComparisonMetric,
  after: ComparisonMetric
): boolean {
  return (Object.keys(before) as (keyof ComparisonMetric)[]).some(
    (field) => before[field] !== after[field]
  )
}

function changesMetricValues(
  before: ComparisonMetric[],
  after: ComparisonMetric[]
): boolean {
  return before.some((metric, index) =>
    METRIC_VALUE_FIELDS.some((field) => metric[field] !== after[index][field])
  )
}

export function selectSessionPage(
  session: EditingSession,
  pageId: string
): EditingSession {
  if (!requireWeek(session).pages.some((page) => page.id === pageId)) {
    throw new Error(`Unknown page id: ${pageId}`)
  }
  return { ...session, selectedPageId: pageId }
}

export function readMetricInput(
  session: EditingSession,
  location: MetricInputLocation
): string {
  const { metricIndex, field } = location
  const { page } = requireMetric(session, location)
  const typedValue = page.metrics[metricIndex][field]
  return (
    readMetricInputText(session.metricInput, location) ??
    (typedValue === null ? "" : String(typedValue))
  )
}

export function writeMetricInput(
  session: EditingSession,
  location: MetricInputLocation,
  raw: string
): EditingSession {
  const { metricIndex, field } = location
  const { week, pageIndex } = requireMetric(session, location)
  const parsed = parseMetricInput(raw)
  const metricInput = writeMetricInputText(session.metricInput, location, raw)
  const nextWeek =
    parsed.status === "invalid"
      ? week
      : setDecisionMetricValue(
          week,
          pageIndex,
          metricIndex,
          field,
          parsed.status === "empty" ? null : parsed.value
        )
  return { ...session, week: nextWeek, metricInput }
}

export function moveSessionMetric(
  session: EditingSession,
  move: MetricMove
): EditingSession {
  const { pageId, fromIndex, toIndex } = move
  const { week, pageIndex, page } = requireMetric(session, {
    pageId,
    metricIndex: fromIndex,
  })
  if (!page.metrics[toIndex]) {
    throw new Error(`Unknown Comparison Metric: ${pageId}[${toIndex}]`)
  }
  const next = moveDecisionMetric(week, pageIndex, fromIndex, toIndex)
  return {
    ...session,
    week: next,
    metricInput: remapMetricInputAfterMove(session.metricInput, move),
  }
}

export function addSessionMetric(
  session: EditingSession,
  pageId: string
): EditingSession {
  const { week, pageIndex } = requireMetric(session, {
    pageId,
    metricIndex: 0,
  })
  return { ...session, week: addDecisionMetric(week, pageIndex) }
}

export function removeSessionMetric(
  session: EditingSession,
  metric: MetricLocation
): EditingSession {
  const { week, pageIndex } = requireMetric(session, metric)
  // 先驗證版面數量限制，例外發生時原 Session 與 Metric Input 都不會改動。
  const next = removeDecisionMetric(week, pageIndex, metric.metricIndex)
  return {
    ...session,
    week: next,
    metricInput: remapMetricInputAfterRemove(session.metricInput, metric),
  }
}

export function addSessionPage(
  session: EditingSession,
  page: WeekPage
): EditingSession {
  const week = requireWeek(session)
  if (week.pages.some((existing) => existing.id === page.id)) {
    throw new Error(`Duplicate page id: ${page.id}`)
  }
  if (!session.selectedPageId) {
    throw new Error("No page is selected")
  }
  const result = addPageAfter(week, session.selectedPageId, page)
  return {
    ...session,
    week: result.week,
    selectedPageId: result.selectedPageId,
  }
}

export function deleteSessionPage(
  session: EditingSession,
  pageId: string
): EditingSession {
  const result = deleteSelectedPage(requireWeek(session), pageId)
  const metricInput = Object.fromEntries(
    Object.entries(session.metricInput).filter(([id]) => id !== pageId)
  )
  return {
    ...session,
    week: result.week,
    metricInput,
    selectedPageId: result.selectedPageId,
  }
}

export function moveSessionPage(
  session: EditingSession,
  pageId: string,
  direction: PageMoveDirection
): EditingSession {
  const result = moveSelectedPage(requireWeek(session), pageId, direction)
  return {
    ...session,
    week: result.week,
    selectedPageId: result.selectedPageId,
  }
}

export function sessionReadiness(
  session: EditingSession,
  pageId: string
): ExportIssue[] {
  const page = requireWeek(session).pages.find((entry) => entry.id === pageId)
  if (!page) {
    throw new Error(`Unknown page id: ${pageId}`)
  }
  return isStructuredWeekPage(page)
    ? assessContentReadiness(page, {
        metricInput: session.metricInput,
        reportingMonday: session.week?.start,
      })
    : []
}

export function canSaveSession(session: EditingSession): {
  session: EditingSession
  allowed: boolean
} {
  const saveError = saveBlockReason(requireWeek(session), session.metricInput)
  return { session: { ...session, saveError }, allowed: saveError === null }
}

function saveBlockReason(
  week: WeekDocument,
  inputs: MetricInputMap
): string | null {
  if (weekHasInvalidMetricInputs(week, inputs))
    return "Fix invalid metric values before saving"
  if (weekHasInvalidTrendInputs(week, inputs))
    return "Fix invalid Trend & Target input before saving"
  return null
}
