import { isFiniteNonNegative } from "./week-document"
import { withUnit } from "./unit-format"

export type MetricFormat = {
  unit: string
  unitPosition: "before" | "after"
  unitSpacing: "none" | "space"
  precision: 0 | 1 | 2
}

export type MetricBarPercents = {
  baseline: number
  candidate: number
}

export type MetricInputResult =
  | { status: "empty"; value: null }
  | { status: "valid"; value: number }
  | { status: "invalid"; message: string }

export function formatMetricValue(
  value: number | null,
  format: MetricFormat
): string {
  if (value === null) {
    return "—"
  }

  return withUnit(value.toFixed(format.precision), format)
}

export function calculateMetricBarPercents(
  baseline: number | null,
  candidate: number | null
): MetricBarPercents {
  const baselineBar = barLength(baseline, candidate)
  const candidateBar = barLength(candidate, baseline)
  return { baseline: baselineBar, candidate: candidateBar }
}

function barLength(value: number | null, other: number | null): number {
  if (value === null || value === 0) {
    return 0
  }
  if (other === null || other === 0) {
    return 100
  }
  const peak = Math.max(value, other)
  return Math.round((value / peak) * 100)
}

export function parseMetricInput(raw: string): MetricInputResult {
  if (raw.trim() === "") {
    return { status: "empty", value: null }
  }

  if (!/^\d+(\.\d+)?$/.test(raw.trim())) {
    return {
      status: "invalid",
      message: "Metric value must be a finite non-negative number",
    }
  }

  const value = Number(raw)
  if (!isFiniteNonNegative(value)) {
    return {
      status: "invalid",
      message: "Metric value must be a finite non-negative number",
    }
  }

  return { status: "valid", value }
}
