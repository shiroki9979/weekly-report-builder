import { assessContentReadiness, type ExportIssue } from "./export-readiness"
import {
  METRIC_VALUE_FIELDS,
  readMetricInputText,
  remapMetricInputAfterMove,
  remapMetricInputAfterRemove,
  deckHasInvalidMetricInputs,
  writeMetricInputText,
  type MetricInputLocation,
  type MetricInputMap,
  type MetricLocation,
  type MetricMove,
} from "./metric-input"
import { parseMetricInput } from "./metric-format"
import { deckHasInvalidTrendInputs } from "./trend-input"
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
  isStructuredPage,
  type ComparisonMetric,
  type Deck,
  type Page,
} from "./deck"

export type EditingSession = {
  readonly decks: string[]
  readonly selectedDeckId: string
  readonly loadStatus: SessionLoadStatus
  readonly deck: Deck | null
  readonly metricInput: MetricInputMap
  readonly selectedPageId: string | null
  readonly saveError: string | null
  readonly saving: boolean
  readonly savedMessage: string | null
  readonly creating: boolean
  readonly createError: string | null
}

// 快照在執行期深度凍結；匯出流程沿用 Deck 型別，誤寫會直接拋錯而不會改到快照
export type SessionOperationSnapshot = Readonly<{
  deckId: string
  deck: Deck
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
  if (!session.deck || session.loadStatus.kind !== "ready") return null
  return freezeDeep({
    deckId: session.selectedDeckId,
    deck: structuredClone(session.deck),
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
  deck: Deck | null = null,
  deckId = ""
): EditingSession {
  return {
    decks: [],
    selectedDeckId: deckId,
    loadStatus: deck ? { kind: "ready" } : { kind: "loading" },
    deck,
    metricInput: {},
    selectedPageId: deck?.pages[0]?.id ?? null,
    saveError: null,
    saving: false,
    savedMessage: null,
    creating: false,
    createError: null,
  }
}

export function openSessionDeck(
  session: EditingSession,
  deck: Deck | null
): EditingSession {
  return {
    ...createEditingSession(deck),
    decks: session.decks,
    // Deck ID 由開啟時的選擇決定（beginSessionOpen），不可由文件內容反推，否則非日期 id 的 Deck 會存到別的檔案
    selectedDeckId: session.selectedDeckId,
  }
}

export function beginSessionOpen(
  session: EditingSession,
  deckId: string
): EditingSession {
  return {
    ...openSessionDeck(session, null),
    selectedDeckId: deckId,
    loadStatus: { kind: "loading" },
  }
}

export function finishSessionOpen(
  session: EditingSession,
  deck: Deck
): EditingSession {
  return { ...openSessionDeck(session, deck), loadStatus: { kind: "ready" } }
}

export function failSessionOpen(
  session: EditingSession,
  message: string
): EditingSession {
  return {
    ...openSessionDeck(session, null),
    loadStatus: { kind: "error", message },
  }
}

export function setSessionDecks(
  session: EditingSession,
  decks: string[]
): EditingSession {
  return {
    ...session,
    decks,
    loadStatus: decks.length ? session.loadStatus : { kind: "empty" },
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

export function requireDeck(session: EditingSession): Deck {
  if (!session.deck) {
    throw new Error("No deck is open")
  }
  return session.deck
}

// 以 Page ID 找出特定版型的頁面；版型不符視同找不到，呼叫端再依自身語意回報錯誤
export function findSessionPage<T extends Page>(
  session: EditingSession,
  pageId: string,
  hasLayout: (page: Page) => page is T
): { deck: Deck; pageIndex: number; page: T } | null {
  const deck = requireDeck(session)
  const pageIndex = deck.pages.findIndex((page) => page.id === pageId)
  const page = deck.pages[pageIndex]
  if (!page || !hasLayout(page)) return null
  return { deck, pageIndex, page }
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
  update: (deck: Deck) => Deck
): EditingSession {
  // 用凍結副本作比較基準，避免回呼原地修改時連傳入的 Session 一起改掉。
  const baseline = freezeDeep(structuredClone(requireDeck(session)))
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
  return { ...session, deck: next }
}

function changesTrendRange(before: Deck, after: Deck): boolean {
  return after.pages.some((afterPage, index) => {
    const beforePage = before.pages[index]
    return (
      isTrendTargetPage(beforePage) &&
      isTrendTargetPage(afterPage) &&
      beforePage.observations.length !== afterPage.observations.length
    )
  })
}

function changesPageStructure(before: Deck, after: Deck): boolean {
  return (
    after.pages.length !== before.pages.length ||
    after.pages.some(
      (page, index) =>
        page.id !== before.pages[index].id ||
        page.layout !== before.pages[index].layout
    )
  )
}

function changesMetricsUnsafely(before: Deck, after: Deck): boolean {
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
  if (!requireDeck(session).pages.some((page) => page.id === pageId)) {
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
  const { deck, pageIndex } = requireMetric(session, location)
  const parsed = parseMetricInput(raw)
  const metricInput = writeMetricInputText(session.metricInput, location, raw)
  const nextDeck =
    parsed.status === "invalid"
      ? deck
      : setDecisionMetricValue(
          deck,
          pageIndex,
          metricIndex,
          field,
          parsed.status === "empty" ? null : parsed.value
        )
  return { ...session, deck: nextDeck, metricInput }
}

export function moveSessionMetric(
  session: EditingSession,
  move: MetricMove
): EditingSession {
  const { pageId, fromIndex, toIndex } = move
  const { deck, pageIndex, page } = requireMetric(session, {
    pageId,
    metricIndex: fromIndex,
  })
  if (!page.metrics[toIndex]) {
    throw new Error(`Unknown Comparison Metric: ${pageId}[${toIndex}]`)
  }
  const next = moveDecisionMetric(deck, pageIndex, fromIndex, toIndex)
  return {
    ...session,
    deck: next,
    metricInput: remapMetricInputAfterMove(session.metricInput, move),
  }
}

export function addSessionMetric(
  session: EditingSession,
  pageId: string
): EditingSession {
  const { deck, pageIndex } = requireMetric(session, {
    pageId,
    metricIndex: 0,
  })
  return { ...session, deck: addDecisionMetric(deck, pageIndex) }
}

export function removeSessionMetric(
  session: EditingSession,
  metric: MetricLocation
): EditingSession {
  const { deck, pageIndex } = requireMetric(session, metric)
  // 先驗證版面數量限制，例外發生時原 Session 與 Metric Input 都不會改動。
  const next = removeDecisionMetric(deck, pageIndex, metric.metricIndex)
  return {
    ...session,
    deck: next,
    metricInput: remapMetricInputAfterRemove(session.metricInput, metric),
  }
}

export function addSessionPage(
  session: EditingSession,
  page: Page
): EditingSession {
  const deck = requireDeck(session)
  if (deck.pages.some((existing) => existing.id === page.id)) {
    throw new Error(`Duplicate page id: ${page.id}`)
  }
  if (!session.selectedPageId) {
    throw new Error("No page is selected")
  }
  const result = addPageAfter(deck, session.selectedPageId, page)
  return {
    ...session,
    deck: result.deck,
    selectedPageId: result.selectedPageId,
  }
}

export function deleteSessionPage(
  session: EditingSession,
  pageId: string
): EditingSession {
  const result = deleteSelectedPage(requireDeck(session), pageId)
  const metricInput = Object.fromEntries(
    Object.entries(session.metricInput).filter(([id]) => id !== pageId)
  )
  return {
    ...session,
    deck: result.deck,
    metricInput,
    selectedPageId: result.selectedPageId,
  }
}

export function moveSessionPage(
  session: EditingSession,
  pageId: string,
  direction: PageMoveDirection
): EditingSession {
  const result = moveSelectedPage(requireDeck(session), pageId, direction)
  return {
    ...session,
    deck: result.deck,
    selectedPageId: result.selectedPageId,
  }
}

export function sessionReadiness(
  session: EditingSession,
  pageId: string
): ExportIssue[] {
  const page = requireDeck(session).pages.find((entry) => entry.id === pageId)
  if (!page) {
    throw new Error(`Unknown page id: ${pageId}`)
  }
  return isStructuredPage(page)
    ? assessContentReadiness(page, {
        metricInput: session.metricInput,
        asOf: session.deck?.period?.end,
      })
    : []
}

export function canSaveSession(session: EditingSession): {
  session: EditingSession
  allowed: boolean
} {
  const saveError = saveBlockReason(requireDeck(session), session.metricInput)
  return { session: { ...session, saveError }, allowed: saveError === null }
}

function saveBlockReason(deck: Deck, inputs: MetricInputMap): string | null {
  if (deckHasInvalidMetricInputs(deck, inputs))
    return "Fix invalid metric values before saving"
  if (deckHasInvalidTrendInputs(deck, inputs))
    return "Fix invalid Trend & Target input before saving"
  return null
}
