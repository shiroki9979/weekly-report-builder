import type { MetricValueField } from "./metric-draft-buffer"
import { typedPageUpdater } from "./update-week-page"
import {
  assertCanAddEntry,
  assertCanRemoveEntry,
  CARDINALITY,
  isEvidenceDecisionPage,
  type ComparisonMetric,
  type WeekDocument,
} from "./week-document"

const updateDecision = typedPageUpdater(
  isEvidenceDecisionPage,
  "an evidence-decision page"
)

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
    assertCanAddEntry(page.metrics, CARDINALITY.comparisonMetrics)
    return { ...page, metrics: [...page.metrics, blankMetric()] }
  })
}

export function removeDecisionMetric(
  week: WeekDocument,
  pageIndex: number,
  metricIndex: number
): WeekDocument {
  return updateDecision(week, pageIndex, (page) => {
    assertCanRemoveEntry(page.metrics, CARDINALITY.comparisonMetrics)
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
    assertCanAddEntry(page.interpretations, CARDINALITY.interpretations)
    return { ...page, interpretations: [...page.interpretations, ""] }
  })
}

export function removeDecisionInterpretation(
  week: WeekDocument,
  pageIndex: number,
  interpretationIndex: number
): WeekDocument {
  return updateDecision(week, pageIndex, (page) => {
    assertCanRemoveEntry(page.interpretations, CARDINALITY.interpretations)
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
