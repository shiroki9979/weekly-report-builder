import type { MetricFormat } from "./metric-format.ts"

type UnitFormat = Pick<MetricFormat, "unit" | "unitPosition" | "unitSpacing">

export function withUnit(numeric: string, format: UnitFormat): string {
  const { unit, unitPosition, unitSpacing } = format
  if (!unit) return numeric
  const gap = unitSpacing === "space" ? " " : ""
  return unitPosition === "before"
    ? `${unit}${gap}${numeric}`
    : `${numeric}${gap}${unit}`
}
