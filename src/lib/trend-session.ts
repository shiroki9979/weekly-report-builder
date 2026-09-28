import {
  findSessionPage,
  requireWeek,
  type EditingSession,
} from "./editing-session"
import type { ExportIssue } from "./export-readiness"
import {
  clearInputText,
  observationIndex,
  observationPath,
  readInputText,
  writeInputText,
  type MetricInputMap,
  type TrendInputPath,
} from "./metric-input"
import {
  assertTrendEndpointAllowed,
  isStartSettled,
  parseTrendNumber,
  remapTrendObservationInput,
  requireTrendNumber,
  trendInputError,
  type TrendEndpointAction,
  type TrendInputLocation,
} from "./trend-input"
import { observationMonday, trendRangeEnd } from "./trend-target"
import { isCalendarMonday } from "./week-id"
import {
  hasEnteredObservations,
  isTrendTargetPage,
  type UnmeasuredState,
  type WeeklyObservation,
  type TrendTargetPage,
} from "./week-document"

export type ObservationLocation = { pageId: string; index: number }

export type TrendEditorControls = {
  read: (location: TrendInputLocation) => string
  write: (location: TrendInputLocation, raw: string) => void
  setObservationState: (
    location: ObservationLocation,
    state: UnmeasuredState
  ) => void
  changeEndpoint: (pageId: string, action: TrendEndpointAction) => void
  confirmRedate: (pageId: string) => void
  cancelRedate: (pageId: string) => void
  readiness: (pageId: string) => ExportIssue[]
}

// Trend 的 JSON 與未提交的 Metric Input 必須同步更新，綁在一起傳遞以免只改到一邊
type TrendEdit = { page: TrendTargetPage; metricInput: MetricInputMap }

export function readTrendInput(
  session: EditingSession,
  location: TrendInputLocation
): string {
  const { page } = requireTrend(session, location.pageId)
  const pending = readInputText(session.metricInput, location)
  return pending ?? committedTrendText(page, location.path)
}

export function writeTrendInput(
  session: EditingSession,
  location: TrendInputLocation,
  raw: string
): EditingSession {
  const { page, pageIndex } = requireTrend(session, location.pageId)
  const metricInput = writeInputText(session.metricInput, location, raw)
  if (trendInputError(page, metricInput, location.path))
    return { ...session, metricInput }
  const edit = applyTrendInput({ page, metricInput }, location.path, raw)
  return replaceTrend(session, pageIndex, edit)
}

export function setTrendObservationState(
  session: EditingSession,
  location: ObservationLocation,
  state: UnmeasuredState
): EditingSession {
  const { page, pageIndex } = requireTrend(session, location.pageId)
  if (!page.observations[location.index])
    throw new Error(`Unknown Trend observation: ${location.index}`)
  if (state === "missing" && !page.startMonday)
    throw new Error("Set starting Monday before entering observations")
  const edit = releaseClearedStart({
    page: {
      ...page,
      observations: page.observations.with(location.index, { state }),
    },
    metricInput: clearInputText(session.metricInput, {
      pageId: page.id,
      path: observationPath(location.index),
    }),
  })
  return replaceTrend(session, pageIndex, edit)
}

export function changeTrendEndpoint(
  session: EditingSession,
  pageId: string,
  action: TrendEndpointAction
): EditingSession {
  const { page, pageIndex } = requireTrend(session, pageId)
  const startMonday = requireSettledStart(session.metricInput, page)
  assertTrendEndpointAllowed(page.observations, action)
  const inputs = remapTrendObservationInput(session.metricInput, pageId, {
    action,
    length: page.observations.length,
  })
  return replaceTrend(session, pageIndex, {
    page: ENDPOINT_MOVES[action](page, startMonday),
    metricInput: clearInputText(inputs, { pageId, path: "startMonday" }),
  })
}

export function confirmTrendRedate(
  session: EditingSession,
  pageId: string
): EditingSession {
  const { page, pageIndex } = requireTrend(session, pageId)
  const proposed = readInputText(session.metricInput, {
    pageId,
    path: "startMonday",
  })
  if (!proposed || !isCalendarMonday(proposed))
    throw new Error("Choose a valid proposed Monday")
  trendRangeEnd(proposed, page.observations.length)
  return replaceTrend(session, pageIndex, {
    page: { ...page, startMonday: proposed },
    metricInput: clearInputText(session.metricInput, {
      pageId,
      path: "startMonday",
    }),
  })
}

export function cancelTrendRedate(
  session: EditingSession,
  pageId: string
): EditingSession {
  requireTrend(session, pageId)
  return {
    ...session,
    metricInput: clearInputText(session.metricInput, {
      pageId,
      path: "startMonday",
    }),
  }
}

function requireTrend(session: EditingSession, pageId: string) {
  const found = findSessionPage(session, pageId, isTrendTargetPage)
  if (!found) throw new Error(`Unknown Trend & Target page: ${pageId}`)
  return found
}

function replaceTrend(
  session: EditingSession,
  pageIndex: number,
  { page, metricInput }: TrendEdit
): EditingSession {
  const week = requireWeek(session)
  const pages = week.pages.with(pageIndex, page)
  return { ...session, week: { ...week, pages }, metricInput }
}

function committedTrendText(
  page: TrendTargetPage,
  path: TrendInputPath
): string {
  if (path === "startMonday") return page.startMonday ?? ""
  if (path === "target") return page.target?.toString() ?? ""
  const { observation } = observationAt(page, path)
  return observation.state === "measured" ? String(observation.value) : ""
}

function observationAt(page: TrendTargetPage, path: TrendInputPath) {
  const index = observationIndex(path)
  const observation = index === null ? undefined : page.observations[index]
  if (index === null || !observation)
    throw new Error(`Unknown Trend observation: ${path}`)
  return { index, observation }
}

function applyTrendInput(
  edit: TrendEdit,
  path: TrendInputPath,
  raw: string
): TrendEdit {
  if (path === "startMonday") return applyStartMonday(edit, raw)
  if (path === "target")
    return {
      ...edit,
      page: { ...edit.page, target: requireTrendNumber(raw) },
    }
  return applyObservationValue(edit, path, raw)
}

// 起始週一設定前輸入的數值只能暫存為 Metric Input；日期一旦合法就補寫入 JSON，作者不必重打
function applyStartMonday({ page, metricInput }: TrendEdit, raw: string) {
  if (raw === "") return { page: { ...page, startMonday: null }, metricInput }
  const observations = page.observations.map(
    (entry, index): WeeklyObservation =>
      entry.state === "unfilled"
        ? (pendingMeasurement(metricInput, page.id, index) ?? entry)
        : entry
  )
  return { page: { ...page, startMonday: raw, observations }, metricInput }
}

function pendingMeasurement(
  inputs: MetricInputMap,
  pageId: string,
  index: number
): WeeklyObservation | null {
  const pending = readInputText(inputs, {
    pageId,
    path: observationPath(index),
  })
  const value = pending === undefined ? null : parseTrendNumber(pending)
  return typeof value === "number" ? { state: "measured", value } : null
}

function applyObservationValue(
  { page, metricInput }: TrendEdit,
  path: TrendInputPath,
  raw: string
): TrendEdit {
  const { index, observation } = observationAt(page, path)
  if (observation.state === "missing")
    throw new Error(`Missing Trend observation is not editable: ${path}`)
  const value = requireTrendNumber(raw)
  const next: WeeklyObservation =
    value === null ? { state: "unfilled" } : { state: "measured", value }
  return releaseClearedStart({
    page: { ...page, observations: page.observations.with(index, next) },
    metricInput,
  })
}

// 清空日期時若仍有已輸入週次，日期須留在 JSON；等最後一筆也清掉才真正解除日期
function releaseClearedStart({ page, metricInput }: TrendEdit): TrendEdit {
  const cleared =
    readInputText(metricInput, { pageId: page.id, path: "startMonday" }) ===
      "" && !hasEnteredObservations(page.observations)
  if (!cleared) return { page, metricInput }
  return {
    page: { ...page, startMonday: null },
    metricInput: clearInputText(metricInput, {
      pageId: page.id,
      path: "startMonday",
    }),
  }
}

function requireSettledStart(
  inputs: MetricInputMap,
  page: TrendTargetPage
): string {
  const pending = readInputText(inputs, {
    pageId: page.id,
    path: "startMonday",
  })
  if (!isStartSettled(page, pending))
    throw new Error("Set a valid starting Monday before changing the range")
  return page.startMonday
}

const ENDPOINT_MOVES: Record<
  TrendEndpointAction,
  (page: TrendTargetPage, startMonday: string) => TrendTargetPage
> = {
  prepend: (page, startMonday) => ({
    ...page,
    startMonday: observationMonday(startMonday, -1),
    observations: [{ state: "unfilled" }, ...page.observations],
  }),
  append: (page, startMonday) => {
    // 新末週超出 ISO 日期範圍時直接拋錯，不新增週次
    trendRangeEnd(startMonday, page.observations.length + 1)
    return {
      ...page,
      observations: [...page.observations, { state: "unfilled" }],
    }
  },
  "remove-first": (page, startMonday) => ({
    ...page,
    startMonday: observationMonday(startMonday, 1),
    observations: page.observations.slice(1),
  }),
  "remove-last": (page) => ({
    ...page,
    observations: page.observations.slice(0, -1),
  }),
}
