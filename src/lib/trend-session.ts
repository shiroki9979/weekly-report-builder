import {
  findSessionPage,
  requireDeck,
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
  remapTrendObservationInput,
  requireTrendNumber,
  trendInputError,
  trendStartInput,
  trendStartRequired,
  type TrendEndpointAction,
  type TrendInputLocation,
} from "./trend-input"
import {
  alignTrendStart,
  observationDate,
  trendDatingError,
  trendRangeEnd,
} from "./trend-target"
import {
  hasEnteredObservations,
  isTrendTargetPage,
  type TrendCadence,
  type UnmeasuredState,
  type TrendObservation,
  type TrendTargetPage,
} from "./deck"

export type ObservationLocation = { pageId: string; index: number }

export type TrendEditorControls = {
  read: (location: TrendInputLocation) => string
  write: (location: TrendInputLocation, raw: string) => void
  setObservationState: (
    location: ObservationLocation,
    state: UnmeasuredState
  ) => void
  changeEndpoint: (pageId: string, action: TrendEndpointAction) => void
  setCadence: (pageId: string, cadence: TrendCadence) => void
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
  if (observationIndex(location.path) !== null && !page.start)
    throw new Error(trendStartRequired(page))
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
  if (!page.start) throw new Error(trendStartRequired(page))
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
  const start = requireSettledStart(session.metricInput, page)
  assertTrendEndpointAllowed(page.observations, action)
  const inputs = remapTrendObservationInput(session.metricInput, pageId, {
    action,
    length: page.observations.length,
  })
  return replaceTrend(session, pageIndex, {
    page: ENDPOINT_MOVES[action](page, start),
    metricInput: clearInputText(inputs, trendStartInput(pageId)),
  })
}

// 已輸入的觀測掛在目前 cadence 的日期上；切換會改變每個值代表的期間，所以只在尚未輸入時允許
export function setTrendCadence(
  session: EditingSession,
  pageId: string,
  cadence: TrendCadence
): EditingSession {
  const { page, pageIndex } = requireTrend(session, pageId)
  if (cadence === page.cadence) return session
  if (hasEnteredObservations(page.observations))
    throw new Error(TREND_CADENCE_LOCKED)
  return replaceTrend(session, pageIndex, {
    page: { ...page, cadence, start: alignTrendStart(cadence, page.start) },
    metricInput: clearInputText(session.metricInput, trendStartInput(pageId)),
  })
}

export const TREND_CADENCE_LOCKED =
  "Clear entered observations before changing the cadence"

export function confirmTrendRedate(
  session: EditingSession,
  pageId: string
): EditingSession {
  const { page, pageIndex } = requireTrend(session, pageId)
  const proposed = readInputText(session.metricInput, trendStartInput(pageId))
  if (!proposed) throw new Error(`No proposed start to confirm for ${pageId}`)
  const datingError = trendDatingError(
    page.cadence,
    proposed,
    page.observations.length
  )
  if (datingError)
    throw new Error(
      `Cannot confirm proposed start ${proposed}: ${datingError.message}`
    )
  return replaceTrend(session, pageIndex, {
    page: { ...page, start: proposed },
    metricInput: clearInputText(session.metricInput, trendStartInput(pageId)),
  })
}

export function cancelTrendRedate(
  session: EditingSession,
  pageId: string
): EditingSession {
  requireTrend(session, pageId)
  return {
    ...session,
    metricInput: clearInputText(session.metricInput, trendStartInput(pageId)),
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
  const deck = requireDeck(session)
  const pages = deck.pages.with(pageIndex, page)
  return { ...session, deck: { ...deck, pages }, metricInput }
}

function committedTrendText(
  page: TrendTargetPage,
  path: TrendInputPath
): string {
  if (path === "start") return page.start ?? ""
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
  if (path === "start")
    return { ...edit, page: { ...edit.page, start: raw || null } }
  if (path === "target")
    return {
      ...edit,
      page: { ...edit.page, target: requireTrendNumber(raw) },
    }
  return applyObservationValue(edit, path, raw)
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
  const next: TrendObservation =
    value === null ? { state: "unfilled" } : { state: "measured", value }
  return releaseClearedStart({
    page: { ...page, observations: page.observations.with(index, next) },
    metricInput,
  })
}

// 清空日期時若仍有已輸入觀測，日期須留在 JSON；等最後一筆也清掉才真正解除日期
function releaseClearedStart({ page, metricInput }: TrendEdit): TrendEdit {
  const cleared =
    readInputText(metricInput, trendStartInput(page.id)) === "" &&
    !hasEnteredObservations(page.observations)
  if (!cleared) return { page, metricInput }
  return {
    page: { ...page, start: null },
    metricInput: clearInputText(metricInput, trendStartInput(page.id)),
  }
}

function requireSettledStart(
  inputs: MetricInputMap,
  page: TrendTargetPage
): string {
  const pending = readInputText(inputs, trendStartInput(page.id))
  if (!isStartSettled(page, pending))
    throw new Error("Set a valid start before changing the range")
  return page.start
}

const ENDPOINT_MOVES: Record<
  TrendEndpointAction,
  (page: TrendTargetPage, start: string) => TrendTargetPage
> = {
  prepend: (page, start) => ({
    ...page,
    start: observationDate(page.cadence, start, -1),
    observations: [{ state: "unfilled" }, ...page.observations],
  }),
  append: (page, start) => {
    // 新末期超出 ISO 日期範圍時直接拋錯，不新增觀測
    trendRangeEnd(page.cadence, start, page.observations.length + 1)
    return {
      ...page,
      observations: [...page.observations, { state: "unfilled" }],
    }
  },
  "remove-first": (page, start) => ({
    ...page,
    start: observationDate(page.cadence, start, 1),
    observations: page.observations.slice(1),
  }),
  "remove-last": (page) => ({
    ...page,
    observations: page.observations.slice(0, -1),
  }),
}
