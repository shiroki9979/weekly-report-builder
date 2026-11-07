import type { MetricFormat } from "./metric-format"
import type { MetricValueField } from "./metric-input"
import { moveEntry } from "./move-entry"
import { typedPageUpdater } from "./update-deck-page"
import {
  assertCanAddEntry,
  assertCanRemoveEntry,
  CARDINALITY,
  isEvidenceDecisionPage,
  type ComparisonMetric,
  type Deck,
} from "./deck"

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
  deck: Deck,
  pageIndex: number,
  verdict: string
): Deck {
  return updateDecision(deck, pageIndex, (page) => ({ ...page, verdict }))
}

export function setDecisionMetricLabel(
  deck: Deck,
  pageIndex: number,
  metricIndex: number,
  label: string
): Deck {
  return updateDecision(deck, pageIndex, (page) => ({
    ...page,
    metrics: page.metrics.map((metric, index) =>
      index === metricIndex ? { ...metric, label } : metric
    ),
  }))
}

export function setDecisionMetricFormat(
  deck: Deck,
  pageIndex: number,
  metricIndex: number,
  patch: Partial<MetricFormat>
): Deck {
  return updateDecision(deck, pageIndex, (page) => ({
    ...page,
    metrics: page.metrics.map((metric, index) =>
      index === metricIndex ? { ...metric, ...patch } : metric
    ),
  }))
}

export function setDecisionMetricValue(
  deck: Deck,
  pageIndex: number,
  metricIndex: number,
  field: MetricValueField,
  value: number | null
): Deck {
  return updateDecision(deck, pageIndex, (page) => ({
    ...page,
    metrics: page.metrics.map((metric, index) =>
      index === metricIndex ? { ...metric, [field]: value } : metric
    ),
  }))
}

export function addDecisionMetric(deck: Deck, pageIndex: number): Deck {
  return updateDecision(deck, pageIndex, (page) => {
    assertCanAddEntry(page.metrics, CARDINALITY.comparisonMetrics)
    return { ...page, metrics: [...page.metrics, blankMetric()] }
  })
}

export function removeDecisionMetric(
  deck: Deck,
  pageIndex: number,
  metricIndex: number
): Deck {
  return updateDecision(deck, pageIndex, (page) => {
    assertCanRemoveEntry(page.metrics, CARDINALITY.comparisonMetrics)
    return {
      ...page,
      metrics: page.metrics.filter((_, index) => index !== metricIndex),
    }
  })
}

export function moveDecisionMetric(
  deck: Deck,
  pageIndex: number,
  fromIndex: number,
  toIndex: number
): Deck {
  return updateDecision(deck, pageIndex, (page) => {
    return {
      ...page,
      metrics: moveEntry(page.metrics, { from: fromIndex, to: toIndex }),
    }
  })
}

export function setDecisionInterpretation(
  deck: Deck,
  pageIndex: number,
  interpretationIndex: number,
  value: string
): Deck {
  return updateDecision(deck, pageIndex, (page) => ({
    ...page,
    interpretations: page.interpretations.map((entry, index) =>
      index === interpretationIndex ? value : entry
    ),
  }))
}

export function addDecisionInterpretation(deck: Deck, pageIndex: number): Deck {
  return updateDecision(deck, pageIndex, (page) => {
    assertCanAddEntry(page.interpretations, CARDINALITY.interpretations)
    return { ...page, interpretations: [...page.interpretations, ""] }
  })
}

export function removeDecisionInterpretation(
  deck: Deck,
  pageIndex: number,
  interpretationIndex: number
): Deck {
  return updateDecision(deck, pageIndex, (page) => {
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
  deck: Deck,
  pageIndex: number,
  fromIndex: number,
  toIndex: number
): Deck {
  return updateDecision(deck, pageIndex, (page) => {
    return {
      ...page,
      interpretations: moveEntry(page.interpretations, {
        from: fromIndex,
        to: toIndex,
      }),
    }
  })
}
