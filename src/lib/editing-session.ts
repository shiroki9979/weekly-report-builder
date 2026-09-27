import { assessContentReadiness, type ExportIssue } from "./export-readiness"
import {
  metricInputPath,
  readMetricInputText,
  remapMetricInputAfterMove,
  remapMetricInputAfterRemove,
  weekHasInvalidMetricInputs,
  writeMetricInputText,
  type MetricInputMap,
  type MetricValueField,
} from "./metric-input"
import { parseMetricInput } from "./metric-format"
import {
  addPageAfter,
  deleteSelectedPage,
  moveSelectedPage,
} from "./page-lifecycle"
import {
  moveDecisionMetric,
  removeDecisionMetric,
  setDecisionMetricValue,
} from "./evidence-decision-editor"
import {
  isEvidenceDecisionPage,
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

type DeepReadonly<T> = T extends object
  ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
  : T

export type SessionOperationSnapshot = Readonly<{
  monday: string
  week: DeepReadonly<WeekDocument>
  selectedPageId: string | null
  metricInput: MetricInputMap
}>

export type MetricInputLocation = Readonly<{
  pageId: string
  metricIndex: number
  field: MetricValueField
}>

function freezeDeep<T extends object>(value: T): DeepReadonly<T> {
  Object.freeze(value)
  for (const nested of Object.values(value)) {
    if (nested && typeof nested === "object") freezeDeep(nested)
  }
  return value as DeepReadonly<T>
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
    saving: false,
    saveError: null,
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

function metricLocation(
  session: EditingSession,
  pageId: string,
  index: number
) {
  const week = requireWeek(session)
  const pageIndex = week.pages.findIndex((page) => page.id === pageId)
  const page = week.pages[pageIndex]
  if (!page || !isEvidenceDecisionPage(page) || !page.metrics[index]) {
    throw new Error(`Unknown Comparison Metric: ${pageId}[${index}]`)
  }
  return { week, pageIndex, page }
}

function changedMetricFields(
  before: ComparisonMetric,
  after: ComparisonMetric
): (keyof ComparisonMetric)[] {
  return (Object.keys(before) as (keyof ComparisonMetric)[]).filter(
    (field) => before[field] !== after[field]
  )
}

function hasUnsupportedMetricChange(
  before: ComparisonMetric[],
  after: ComparisonMetric[]
): boolean {
  if (after.length < before.length) return true
  if (
    after.some((metric, index) => {
      const oldIndex = before.indexOf(metric)
      return oldIndex !== -1 && oldIndex !== index
    })
  )
    return true
  // Metric 沒有獨立 ID；一般內容更新限改一個欄位，避免複製物件後換位使輸入錯置。
  const changes = before.flatMap((metric, index) =>
    changedMetricFields(metric, after[index])
  )
  return (
    changes.length > 1 ||
    changes.includes("baselineValue") ||
    changes.includes("candidateValue")
  )
}

export function editSessionContent(
  session: EditingSession,
  update: (week: WeekDocument) => WeekDocument
): EditingSession {
  const week = requireWeek(session)
  const next = update(week)
  if (
    next.pages.length !== week.pages.length ||
    next.pages.some(
      (page, index) =>
        page.id !== week.pages[index].id ||
        page.layout !== week.pages[index].layout
    )
  ) {
    throw new Error(
      "Page changes require a dedicated Editing Session operation"
    )
  }
  if (
    next.pages.some((nextPage, pageIndex) => {
      const page = week.pages[pageIndex]
      if (!isEvidenceDecisionPage(page) || !isEvidenceDecisionPage(nextPage)) {
        return false
      }
      return hasUnsupportedMetricChange(page.metrics, nextPage.metrics)
    })
  ) {
    throw new Error(
      "Metric changes require a dedicated Editing Session operation"
    )
  }
  return { ...session, week: next }
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
  { pageId, metricIndex, field }: MetricInputLocation
): string {
  const { page } = metricLocation(session, pageId, metricIndex)
  return (
    readMetricInputText(
      session.metricInput,
      pageId,
      metricInputPath(metricIndex, field)
    ) ??
    (page.metrics[metricIndex][field] === null
      ? ""
      : String(page.metrics[metricIndex][field]))
  )
}

export function writeMetricInput(
  session: EditingSession,
  { pageId, metricIndex, field }: MetricInputLocation,
  raw: string
): EditingSession {
  const { week, pageIndex } = metricLocation(session, pageId, metricIndex)
  const parsed = parseMetricInput(raw)
  const metricInput = writeMetricInputText(
    session.metricInput,
    pageId,
    metricInputPath(metricIndex, field),
    raw
  )
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
  return { ...session, week: nextWeek, metricInput, saveError: null }
}

export function moveSessionMetric(
  session: EditingSession,
  pageId: string,
  fromIndex: number,
  toIndex: number
): EditingSession {
  const { week, pageIndex, page } = metricLocation(session, pageId, fromIndex)
  if (!page.metrics[toIndex]) {
    throw new Error(`Unknown Comparison Metric: ${pageId}[${toIndex}]`)
  }
  const next = moveDecisionMetric(week, pageIndex, fromIndex, toIndex)
  return {
    ...session,
    week: next,
    metricInput: remapMetricInputAfterMove(
      session.metricInput,
      pageId,
      fromIndex,
      toIndex
    ),
  }
}

export function removeSessionMetric(
  session: EditingSession,
  pageId: string,
  metricIndex: number
): EditingSession {
  const { week, pageIndex } = metricLocation(session, pageId, metricIndex)
  // 先驗證版面數量限制，例外發生時原 Session 與 Metric Input 都不會改動。
  const next = removeDecisionMetric(week, pageIndex, metricIndex)
  return {
    ...session,
    week: next,
    metricInput: remapMetricInputAfterRemove(
      session.metricInput,
      pageId,
      metricIndex
    ),
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
  direction: "up" | "down"
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
    ? assessContentReadiness(page, session.metricInput)
    : []
}

export function canSaveSession(session: EditingSession): {
  session: EditingSession
  allowed: boolean
} {
  const week = requireWeek(session)
  const allowed = !weekHasInvalidMetricInputs(week, session.metricInput)
  return {
    session: {
      ...session,
      saveError: allowed ? null : "Fix invalid metric values before saving",
    },
    allowed,
  }
}
