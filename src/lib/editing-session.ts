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
import { isCalendarMonday, observationMonday } from "./trend-target"
import {
  clearTrendInputText,
  hasInvalidTrendInput,
  parseTrendNumber,
  readTrendInputText,
  remapTrendObservationInput,
  trendInputError,
  writeTrendInputText,
  type TrendInputLocation,
} from "./trend-input"
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
  type TrendTargetPage,
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

export type TrendEditorControls = {
  read: (location: TrendInputLocation) => string
  write: (location: TrendInputLocation, raw: string) => void
  setObservationState: (
    location: { pageId: string; index: number },
    state: "missing" | "unfilled"
  ) => void
  endpoint: (pageId: string, action: TrendEndpointAction) => void
  confirmRedate: (pageId: string) => void
  cancelRedate: (pageId: string) => void
  readiness: (pageId: string) => ExportIssue[]
}

export type TrendEndpointAction =
  "prepend" | "append" | "remove-first" | "remove-last"

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

function requireWeek(session: EditingSession): WeekDocument {
  if (!session.week) {
    throw new Error("No week is open")
  }
  return session.week
}

function requireMetric(
  session: EditingSession,
  { pageId, metricIndex }: MetricLocation
) {
  const week = requireWeek(session)
  const pageIndex = week.pages.findIndex((page) => page.id === pageId)
  const page = week.pages[pageIndex]
  if (!page || !isEvidenceDecisionPage(page) || !page.metrics[metricIndex]) {
    throw new Error(`Unknown Comparison Metric: ${pageId}[${metricIndex}]`)
  }
  return { week, pageIndex, page }
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

export function readTrendInput(
  session: EditingSession,
  location: TrendInputLocation
): string {
  const page = requireWeek(session).pages.find(
    (entry) => entry.id === location.pageId
  )
  if (!page || !isTrendTargetPage(page))
    throw new Error(`Unknown Trend & Target page: ${location.pageId}`)
  const pending = readTrendInputText(session.metricInput, location)
  if (pending !== undefined) return pending
  if (location.path === "startMonday") return page.startMonday ?? ""
  if (location.path === "target") return page.target?.toString() ?? ""
  const match = /^observations\[(\d+)\]\.value$/.exec(location.path)
  const observation = match ? page.observations[Number(match[1])] : null
  if (!observation)
    throw new Error(`Unknown Trend observation: ${location.path}`)
  return observation.state === "measured" ? String(observation.value) : ""
}

export function writeTrendInput(
  session: EditingSession,
  location: TrendInputLocation,
  raw: string
): EditingSession {
  const week = requireWeek(session)
  const pageIndex = week.pages.findIndex(
    (entry) => entry.id === location.pageId
  )
  const page = week.pages[pageIndex]
  if (!page || !isTrendTargetPage(page))
    throw new Error(`Unknown Trend & Target page: ${location.pageId}`)
  let metricInput = writeTrendInputText(session.metricInput, location, raw)
  if (trendInputError(page, metricInput, location.path))
    return { ...session, metricInput }
  let next: TrendTargetPage
  if (location.path === "startMonday") {
    const observations = page.observations.map((entry, index) => {
      const pending = readTrendInputText(metricInput, {
        pageId: page.id,
        path: `observations[${index}].value`,
      })
      const value = pending === undefined ? null : parseTrendNumber(pending)
      return raw !== "" &&
        entry.state === "unfilled" &&
        typeof value === "number"
        ? ({ state: "measured", value } as const)
        : entry
    })
    next = { ...page, startMonday: raw === "" ? null : raw, observations }
  } else if (location.path === "target") {
    next = { ...page, target: parseTrendNumber(raw) as number | null }
  } else {
    const match = /^observations\[(\d+)\]\.value$/.exec(location.path)
    const index = match ? Number(match[1]) : -1
    if (
      !page.observations[index] ||
      page.observations[index].state === "missing"
    ) {
      throw new Error(`Unknown editable Trend observation: ${location.path}`)
    }
    const value = parseTrendNumber(raw)
    const observations = [...page.observations]
    observations[index] =
      value === null
        ? { state: "unfilled" }
        : { state: "measured", value: value as number }
    next = { ...page, observations }
    if (
      metricInput[page.id]?.startMonday === "" &&
      observations.every((entry) => entry.state === "unfilled")
    ) {
      next = { ...next, startMonday: null }
      metricInput = clearTrendInputText(metricInput, {
        pageId: page.id,
        path: "startMonday",
      })
    }
  }
  const pages = [...week.pages]
  pages[pageIndex] = next
  return { ...session, week: { ...week, pages }, metricInput }
}

export function setTrendObservationState(
  session: EditingSession,
  location: { pageId: string; index: number },
  state: "missing" | "unfilled"
): EditingSession {
  const week = requireWeek(session)
  const pageIndex = week.pages.findIndex(
    (entry) => entry.id === location.pageId
  )
  const page = week.pages[pageIndex]
  if (!page || !isTrendTargetPage(page))
    throw new Error(`Unknown Trend & Target page: ${location.pageId}`)
  if (!page.observations[location.index])
    throw new Error(`Unknown Trend observation: ${location.index}`)
  if (state === "missing" && !page.startMonday)
    throw new Error("Set starting Monday before entering observations")
  const observations = [...page.observations]
  observations[location.index] = { state }
  const pageInput = { ...session.metricInput[location.pageId] }
  delete pageInput[`observations[${location.index}].value`]
  const clearStart =
    pageInput.startMonday === "" &&
    observations.every((entry) => entry.state === "unfilled")
  if (clearStart) delete pageInput.startMonday
  const pages = [...week.pages]
  pages[pageIndex] = {
    ...page,
    observations,
    startMonday: clearStart ? null : page.startMonday,
  }
  return {
    ...session,
    week: { ...week, pages },
    metricInput: { ...session.metricInput, [location.pageId]: pageInput },
  }
}

function requireTrend(session: EditingSession, pageId: string) {
  const week = requireWeek(session)
  const pageIndex = week.pages.findIndex((entry) => entry.id === pageId)
  const page = week.pages[pageIndex]
  if (!page || !isTrendTargetPage(page))
    throw new Error(`Unknown Trend & Target page: ${pageId}`)
  return { week, pageIndex, page }
}

function replaceTrend(
  session: EditingSession,
  pageIndex: number,
  page: TrendTargetPage,
  metricInput: MetricInputMap
): EditingSession {
  const week = requireWeek(session)
  const pages = [...week.pages]
  pages[pageIndex] = page
  return { ...session, week: { ...week, pages }, metricInput }
}

export function changeTrendEndpoint(
  session: EditingSession,
  pageId: string,
  action: TrendEndpointAction
): EditingSession {
  const { page, pageIndex } = requireTrend(session, pageId)
  if (
    !page.startMonday ||
    readTrendInput(session, { pageId, path: "startMonday" }) !==
      page.startMonday
  )
    throw new Error("Set a valid starting Monday before changing the range")
  const length = page.observations.length
  if ((action === "prepend" || action === "append") && length >= 12)
    throw new Error("Trend range cannot exceed twelve weeks")
  if ((action === "remove-first" || action === "remove-last") && length <= 2)
    throw new Error("Trend range requires at least two weeks")
  const observations = [...page.observations]
  let startMonday = page.startMonday
  if (action === "prepend") {
    startMonday = observationMonday(startMonday, -1)
    observations.unshift({ state: "unfilled" })
  } else if (action === "append") {
    observationMonday(startMonday, length)
    observations.push({ state: "unfilled" })
  } else if (action === "remove-first") {
    startMonday = observationMonday(startMonday, 1)
    observations.shift()
  } else {
    observations.pop()
  }
  const inputs = remapTrendObservationInput(
    session.metricInput,
    pageId,
    action,
    length
  )
  return replaceTrend(
    session,
    pageIndex,
    { ...page, startMonday, observations },
    clearTrendInputText(inputs, { pageId, path: "startMonday" })
  )
}

export function confirmTrendRedate(
  session: EditingSession,
  pageId: string
): EditingSession {
  const { page, pageIndex } = requireTrend(session, pageId)
  const proposed = readTrendInputText(session.metricInput, {
    pageId,
    path: "startMonday",
  })
  if (!proposed || !isCalendarMonday(proposed))
    throw new Error("Choose a valid proposed Monday")
  observationMonday(proposed, page.observations.length - 1)
  return replaceTrend(
    session,
    pageIndex,
    { ...page, startMonday: proposed },
    clearTrendInputText(session.metricInput, { pageId, path: "startMonday" })
  )
}

export function cancelTrendRedate(
  session: EditingSession,
  pageId: string
): EditingSession {
  requireTrend(session, pageId)
  return {
    ...session,
    metricInput: clearTrendInputText(session.metricInput, {
      pageId,
      path: "startMonday",
    }),
  }
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
    ? assessContentReadiness(page, session.metricInput, session.week?.start)
    : []
}

export function canSaveSession(session: EditingSession): {
  session: EditingSession
  allowed: boolean
} {
  const week = requireWeek(session)
  const metricInvalid = weekHasInvalidMetricInputs(week, session.metricInput)
  const trendInvalid = week.pages.some(
    (page) =>
      isTrendTargetPage(page) && hasInvalidTrendInput(page, session.metricInput)
  )
  const allowed = !metricInvalid && !trendInvalid
  return {
    session: {
      ...session,
      saveError: metricInvalid
        ? "Fix invalid metric values before saving"
        : trendInvalid
          ? "Fix invalid Trend & Target input before saving"
          : null,
    },
    allowed,
  }
}
