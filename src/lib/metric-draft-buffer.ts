import { parseMetricInput } from "./metric-format"
import { isEvidenceDecisionPage, type WeekDocument } from "./week-document"

export type MetricValueField = "baselineValue" | "candidateValue"

export type MetricDraftPath = `metrics[${number}].${MetricValueField}`

export type PageMetricDrafts = Partial<Record<MetricDraftPath, string>>

// 以 Page ID 分層而非字串串接：Page ID 只要求非空，可含 `:` 等任何分隔字元
export type MetricDraftBuffer = Readonly<Record<string, PageMetricDrafts>>

export const METRIC_VALUE_FIELDS = ["baselineValue", "candidateValue"] as const

const METRIC_DRAFT_PATH = /^metrics\[(\d+)\]\.(baselineValue|candidateValue)$/

export function metricDraftPath(
  metricIndex: number,
  field: MetricValueField
): MetricDraftPath {
  return `metrics[${metricIndex}].${field}`
}

export function readMetricDraft(
  buffer: MetricDraftBuffer,
  pageId: string,
  path: MetricDraftPath
): string | undefined {
  return buffer[pageId]?.[path]
}

export function writeMetricDraft(
  buffer: MetricDraftBuffer,
  pageId: string,
  path: MetricDraftPath,
  raw: string
): MetricDraftBuffer {
  return { ...buffer, [pageId]: { ...buffer[pageId], [path]: raw } }
}

// 刪頁後草稿若留著，之後新頁重用同一個 Page ID 會讓舊的非法輸入復活並擋住 Save
export function pruneMetricDrafts(
  buffer: MetricDraftBuffer,
  week: WeekDocument
): MetricDraftBuffer {
  const pageIds = new Set(week.pages.map((page) => page.id))
  return Object.fromEntries(
    Object.entries(buffer).filter(([pageId]) => pageIds.has(pageId))
  )
}

// 非法輸入寫不回 JSON，typed 值只會停在上一個合法值；只有 raw 草稿看得出使用者目前打錯，所以須獨立檢查
export function invalidMetricDraftMessage(
  buffer: MetricDraftBuffer,
  pageId: string,
  path: MetricDraftPath
): string | null {
  const raw = readMetricDraft(buffer, pageId, path)
  if (raw === undefined) {
    return null
  }
  const parsed = parseMetricInput(raw)
  return parsed.status === "invalid" ? parsed.message : null
}

export function weekHasInvalidMetricDrafts(
  week: WeekDocument,
  buffer: MetricDraftBuffer
): boolean {
  return week.pages.some(
    (page) =>
      isEvidenceDecisionPage(page) &&
      page.metrics.some((_, index) =>
        METRIC_VALUE_FIELDS.some(
          (field) =>
            invalidMetricDraftMessage(
              buffer,
              page.id,
              metricDraftPath(index, field)
            ) !== null
        )
      )
  )
}

type DraftSlots = (string | undefined)[]

function draftSlots(
  drafts: PageMetricDrafts,
  field: MetricValueField
): DraftSlots {
  const slots: DraftSlots = []
  for (const [path, raw] of Object.entries(drafts)) {
    const match = METRIC_DRAFT_PATH.exec(path)
    if (match && match[2] === field) {
      slots[Number(match[1])] = raw
    }
  }
  return slots
}

// Move／Remove 只改 week JSON 索引；raw buffer 必須跟著搬，否則非法草稿會黏在舊 path
function remapPageDrafts(
  buffer: MetricDraftBuffer,
  pageId: string,
  remapSlots: (slots: DraftSlots) => DraftSlots
): MetricDraftBuffer {
  const drafts = buffer[pageId]
  if (!drafts) {
    return buffer
  }

  const remapped: PageMetricDrafts = {}
  for (const field of METRIC_VALUE_FIELDS) {
    remapSlots(draftSlots(drafts, field)).forEach((raw, index) => {
      if (raw !== undefined) {
        remapped[metricDraftPath(index, field)] = raw
      }
    })
  }
  return { ...buffer, [pageId]: remapped }
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

  return remapPageDrafts(buffer, pageId, (slots) => {
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
  return remapPageDrafts(buffer, pageId, (slots) => {
    const padded = Array.from(
      { length: Math.max(slots.length, removedIndex + 1) },
      (_, index) => slots[index]
    )
    padded.splice(removedIndex, 1)
    return padded
  })
}
