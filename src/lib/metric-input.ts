import { parseMetricInput } from "./metric-format"
import { isEvidenceDecisionPage, type WeekDocument } from "./week-document"

export type MetricValueField = "baselineValue" | "candidateValue"

export type MetricInputPath = `metrics[${number}].${MetricValueField}`
export type ObservationInputPath = `observations[${number}].value`
export type TrendInputPath = "startMonday" | "target" | ObservationInputPath

export type PageMetricInputs = Readonly<
  Partial<Record<MetricInputPath | TrendInputPath, string>>
>

// 以 Page ID 分層而非字串串接：Page ID 只要求非空，可含 `:` 等任何分隔字元
export type MetricInputMap = Readonly<Record<string, PageMetricInputs>>

export type MetricLocation = Readonly<{
  pageId: string
  metricIndex: number
}>

export type MetricInputLocation = MetricLocation &
  Readonly<{ field: MetricValueField }>

export type MetricMove = Readonly<{
  pageId: string
  fromIndex: number
  toIndex: number
}>

export const METRIC_VALUE_FIELDS = ["baselineValue", "candidateValue"] as const

const METRIC_INPUT_PATH = /^metrics\[(\d+)\]\.(baselineValue|candidateValue)$/

export function metricInputPath(
  metricIndex: number,
  field: MetricValueField
): MetricInputPath {
  return `metrics[${metricIndex}].${field}`
}

export function readMetricInputText(
  inputsByPage: MetricInputMap,
  { pageId, metricIndex, field }: MetricInputLocation
): string | undefined {
  return inputsByPage[pageId]?.[metricInputPath(metricIndex, field)]
}

export function writeMetricInputText(
  inputsByPage: MetricInputMap,
  { pageId, metricIndex, field }: MetricInputLocation,
  raw: string
): MetricInputMap {
  const path = metricInputPath(metricIndex, field)
  return { ...inputsByPage, [pageId]: { ...inputsByPage[pageId], [path]: raw } }
}

// 非法輸入寫不回 JSON，typed 值只會停在上一個合法值；只有 Metric Input 保留使用者目前打錯的文字，所以須獨立檢查
export function invalidMetricInputMessage(
  inputsByPage: MetricInputMap,
  location: MetricInputLocation
): string | null {
  const raw = readMetricInputText(inputsByPage, location)
  if (raw === undefined) {
    return null
  }
  const parsed = parseMetricInput(raw)
  return parsed.status === "invalid" ? parsed.message : null
}

export function weekHasInvalidMetricInputs(
  week: WeekDocument,
  inputsByPage: MetricInputMap
): boolean {
  return week.pages.some(
    (page) =>
      isEvidenceDecisionPage(page) &&
      page.metrics.some((_, index) =>
        METRIC_VALUE_FIELDS.some(
          (field) =>
            invalidMetricInputMessage(inputsByPage, {
              pageId: page.id,
              metricIndex: index,
              field,
            }) !== null
        )
      )
  )
}

type InputSlots = (string | undefined)[]

function inputSlots(
  inputs: PageMetricInputs,
  field: MetricValueField
): InputSlots {
  const slots: InputSlots = []
  for (const [path, raw] of Object.entries(inputs)) {
    const match = METRIC_INPUT_PATH.exec(path)
    if (match && match[2] === field) {
      slots[Number(match[1])] = raw
    }
  }
  return slots
}

// Move／Remove 只改 week JSON 索引；Metric Input 必須跟著搬，否則非法輸入會留在舊 path
function remapPageInputs(
  inputsByPage: MetricInputMap,
  pageId: string,
  remapSlots: (slots: InputSlots) => InputSlots
): MetricInputMap {
  const inputs = inputsByPage[pageId]
  if (!inputs) {
    return inputsByPage
  }

  const remapped: Partial<Record<MetricInputPath, string>> = {}
  for (const field of METRIC_VALUE_FIELDS) {
    remapSlots(inputSlots(inputs, field)).forEach((raw, index) => {
      if (raw !== undefined) {
        remapped[metricInputPath(index, field)] = raw
      }
    })
  }
  return { ...inputsByPage, [pageId]: remapped }
}

export function remapMetricInputAfterMove(
  inputsByPage: MetricInputMap,
  { pageId, fromIndex, toIndex }: MetricMove
): MetricInputMap {
  if (fromIndex === toIndex) {
    return inputsByPage
  }

  return remapPageInputs(inputsByPage, pageId, (slots) => {
    const padded = Array.from(
      { length: Math.max(slots.length, fromIndex + 1, toIndex + 1) },
      (_, index) => slots[index]
    )
    const [moved] = padded.splice(fromIndex, 1)
    padded.splice(toIndex, 0, moved)
    return padded
  })
}

export function remapMetricInputAfterRemove(
  inputsByPage: MetricInputMap,
  { pageId, metricIndex }: MetricLocation
): MetricInputMap {
  return remapPageInputs(inputsByPage, pageId, (slots) => {
    const padded = Array.from(
      { length: Math.max(slots.length, metricIndex + 1) },
      (_, index) => slots[index]
    )
    padded.splice(metricIndex, 1)
    return padded
  })
}
