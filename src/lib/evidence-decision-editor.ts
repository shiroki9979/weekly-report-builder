import type { ExportIssue } from "./export-readiness"
import { parseMetricInput } from "./metric-format"
import {
  isEvidenceDecisionPage,
  type ComparisonMetric,
  type EvidenceDecisionPage,
  type WeekDocument,
  type WeekPage,
} from "./week-document"

export type MetricDraftBuffer = Record<string, string>

export function metricBufferKey(pageId: string, path: string): string {
  return `${pageId}:${path}`
}

function cloneWeek(week: WeekDocument): WeekDocument {
  return structuredClone(week)
}

function requireDecision(
  page: WeekPage,
  pageIndex: number
): EvidenceDecisionPage {
  if (!isEvidenceDecisionPage(page)) {
    throw new Error(`Page ${pageIndex} is not an evidence-decision page`)
  }
  return page
}

function updateDecision(
  week: WeekDocument,
  pageIndex: number,
  updater: (page: EvidenceDecisionPage) => EvidenceDecisionPage
): WeekDocument {
  const next = cloneWeek(week)
  const page = next.pages[pageIndex]
  if (!page) {
    throw new Error(`Page index out of range: ${pageIndex}`)
  }
  next.pages[pageIndex] = updater(requireDecision(page, pageIndex))
  return next
}

export function blankMetric(): ComparisonMetric {
  return {
    label: "",
    baselineValue: null,
    candidateValue: null,
    unit: "",
    unitPosition: "after",
    unitSpacing: "space",
    precision: 1,
  }
}

export function setDecisionVerdict(
  week: WeekDocument,
  pageIndex: number,
  verdict: string
): WeekDocument {
  return updateDecision(week, pageIndex, (page) => ({ ...page, verdict }))
}

export function setDecisionMetricLabel(
  week: WeekDocument,
  pageIndex: number,
  metricIndex: number,
  label: string
): WeekDocument {
  return updateDecision(week, pageIndex, (page) => ({
    ...page,
    metrics: page.metrics.map((metric, index) =>
      index === metricIndex ? { ...metric, label } : metric
    ),
  }))
}

export function setDecisionMetricUnit(
  week: WeekDocument,
  pageIndex: number,
  metricIndex: number,
  unit: string
): WeekDocument {
  return updateDecision(week, pageIndex, (page) => ({
    ...page,
    metrics: page.metrics.map((metric, index) =>
      index === metricIndex ? { ...metric, unit } : metric
    ),
  }))
}

export function setDecisionMetricFormat(
  week: WeekDocument,
  pageIndex: number,
  metricIndex: number,
  patch: Partial<
    Pick<ComparisonMetric, "unitPosition" | "unitSpacing" | "precision">
  >
): WeekDocument {
  return updateDecision(week, pageIndex, (page) => ({
    ...page,
    metrics: page.metrics.map((metric, index) =>
      index === metricIndex ? { ...metric, ...patch } : metric
    ),
  }))
}

export function setDecisionMetricValue(
  week: WeekDocument,
  pageIndex: number,
  metricIndex: number,
  field: "baselineValue" | "candidateValue",
  value: number | null
): WeekDocument {
  return updateDecision(week, pageIndex, (page) => ({
    ...page,
    metrics: page.metrics.map((metric, index) =>
      index === metricIndex ? { ...metric, [field]: value } : metric
    ),
  }))
}

export function addDecisionMetric(
  week: WeekDocument,
  pageIndex: number
): WeekDocument {
  return updateDecision(week, pageIndex, (page) => {
    if (page.metrics.length >= 2) {
      throw new Error("Evidence-backed Decision can have at most 2 metrics")
    }
    return { ...page, metrics: [...page.metrics, blankMetric()] }
  })
}

export function removeDecisionMetric(
  week: WeekDocument,
  pageIndex: number,
  metricIndex: number
): WeekDocument {
  return updateDecision(week, pageIndex, (page) => {
    if (page.metrics.length <= 1) {
      throw new Error("Evidence-backed Decision must keep at least 1 metric")
    }
    return {
      ...page,
      metrics: page.metrics.filter((_, index) => index !== metricIndex),
    }
  })
}

export function moveDecisionMetric(
  week: WeekDocument,
  pageIndex: number,
  fromIndex: number,
  toIndex: number
): WeekDocument {
  return updateDecision(week, pageIndex, (page) => {
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= page.metrics.length ||
      toIndex >= page.metrics.length
    ) {
      return page
    }
    const metrics = [...page.metrics]
    const [entry] = metrics.splice(fromIndex, 1)
    metrics.splice(toIndex, 0, entry)
    return { ...page, metrics }
  })
}

const METRIC_BUFFER_PATH = /^metrics\[(\d+)\]\.(baselineValue|candidateValue)$/

type MetricValueField = "baselineValue" | "candidateValue"

// Move／Remove 只改 week JSON 索引；raw buffer 必須跟著搬，否則非法草稿會黏在舊 path
function remapMetricValueFields(
  buffer: MetricDraftBuffer,
  pageId: string,
  remapSlots: (slots: (string | undefined)[]) => (string | undefined)[]
): MetricDraftBuffer {
  const prefix = `${pageId}:`
  const drafts: {
    index: number
    field: MetricValueField
    value: string
  }[] = []

  for (const [key, value] of Object.entries(buffer)) {
    if (!key.startsWith(prefix)) {
      continue
    }
    const match = METRIC_BUFFER_PATH.exec(key.slice(prefix.length))
    if (!match) {
      continue
    }
    drafts.push({
      index: Number(match[1]),
      field: match[2] as MetricValueField,
      value,
    })
  }

  const next: MetricDraftBuffer = { ...buffer }
  for (const draft of drafts) {
    delete next[
      metricBufferKey(pageId, `metrics[${draft.index}].${draft.field}`)
    ]
  }

  for (const field of ["baselineValue", "candidateValue"] as const) {
    const fieldDrafts = drafts.filter((draft) => draft.field === field)
    if (fieldDrafts.length === 0) {
      continue
    }
    const maxIndex = Math.max(...fieldDrafts.map((draft) => draft.index))
    const slots: (string | undefined)[] = Array.from({ length: maxIndex + 1 })
    for (const draft of fieldDrafts) {
      slots[draft.index] = draft.value
    }
    remapSlots(slots).forEach((raw, index) => {
      if (raw === undefined) {
        return
      }
      next[metricBufferKey(pageId, `metrics[${index}].${field}`)] = raw
    })
  }

  return next
}

export function remapMetricBufferAfterMove(
  buffer: MetricDraftBuffer,
  pageId: string,
  fromIndex: number,
  toIndex: number
): MetricDraftBuffer {
  if (fromIndex === toIndex) {
    return buffer
  }

  return remapMetricValueFields(buffer, pageId, (slots) => {
    const padded = Array.from(
      { length: Math.max(slots.length, fromIndex + 1, toIndex + 1) },
      (_, index) => slots[index]
    )
    const [moved] = padded.splice(fromIndex, 1)
    padded.splice(toIndex, 0, moved)
    return padded
  })
}

export function remapMetricBufferAfterRemove(
  buffer: MetricDraftBuffer,
  pageId: string,
  removedIndex: number
): MetricDraftBuffer {
  return remapMetricValueFields(buffer, pageId, (slots) => {
    const padded = Array.from(
      { length: Math.max(slots.length, removedIndex + 1) },
      (_, index) => slots[index]
    )
    padded.splice(removedIndex, 1)
    return padded
  })
}

export function setDecisionInterpretation(
  week: WeekDocument,
  pageIndex: number,
  interpretationIndex: number,
  value: string
): WeekDocument {
  return updateDecision(week, pageIndex, (page) => ({
    ...page,
    interpretations: page.interpretations.map((entry, index) =>
      index === interpretationIndex ? value : entry
    ),
  }))
}

export function addDecisionInterpretation(
  week: WeekDocument,
  pageIndex: number
): WeekDocument {
  return updateDecision(week, pageIndex, (page) => {
    if (page.interpretations.length >= 2) {
      throw new Error(
        "Evidence-backed Decision can have at most 2 interpretations"
      )
    }
    return { ...page, interpretations: [...page.interpretations, ""] }
  })
}

export function removeDecisionInterpretation(
  week: WeekDocument,
  pageIndex: number,
  interpretationIndex: number
): WeekDocument {
  return updateDecision(week, pageIndex, (page) => {
    if (page.interpretations.length <= 1) {
      throw new Error(
        "Evidence-backed Decision must keep at least 1 interpretation"
      )
    }
    return {
      ...page,
      interpretations: page.interpretations.filter(
        (_, index) => index !== interpretationIndex
      ),
    }
  })
}

export function moveDecisionInterpretation(
  week: WeekDocument,
  pageIndex: number,
  fromIndex: number,
  toIndex: number
): WeekDocument {
  return updateDecision(week, pageIndex, (page) => {
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= page.interpretations.length ||
      toIndex >= page.interpretations.length
    ) {
      return page
    }
    const interpretations = [...page.interpretations]
    const [entry] = interpretations.splice(fromIndex, 1)
    interpretations.splice(toIndex, 0, entry)
    return { ...page, interpretations }
  })
}

export function assessMetricDraftIssues(
  page: WeekPage,
  buffer: MetricDraftBuffer
): ExportIssue[] {
  return collectMetricDraftIssues(page, buffer)
}

function collectMetricDraftIssues(
  page: WeekPage,
  buffer: MetricDraftBuffer
): ExportIssue[] {
  if (!isEvidenceDecisionPage(page)) {
    return []
  }

  const issues: ExportIssue[] = []
  page.metrics.forEach((_, index) => {
    for (const field of ["baselineValue", "candidateValue"] as const) {
      const path = `metrics[${index}].${field}`
      const raw = buffer[metricBufferKey(page.id, path)]
      if (raw === undefined) {
        continue
      }
      const parsed = parseMetricInput(raw)
      if (parsed.status === "invalid") {
        issues.push({
          code: "invalid-content",
          path,
          message: parsed.message,
        })
      }
    }
  })
  return issues
}

export function weekHasInvalidMetricDrafts(
  week: WeekDocument,
  buffer: MetricDraftBuffer
): boolean {
  return week.pages.some(
    (page) => collectMetricDraftIssues(page, buffer).length > 0
  )
}
