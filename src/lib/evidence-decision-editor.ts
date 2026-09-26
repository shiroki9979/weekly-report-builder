import type { MetricValueField } from "./metric-draft-buffer"
import { updateTypedPage } from "./update-week-page"
import {
  isEvidenceDecisionPage,
  type ComparisonMetric,
  type EvidenceDecisionPage,
  type WeekDocument,
} from "./week-document"

function updateDecision(
  week: WeekDocument,
  pageIndex: number,
  updater: (page: EvidenceDecisionPage) => EvidenceDecisionPage
): WeekDocument {
  return updateTypedPage(
    week,
    pageIndex,
    isEvidenceDecisionPage,
    "an evidence-decision page",
    updater
  )
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
  field: MetricValueField,
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
