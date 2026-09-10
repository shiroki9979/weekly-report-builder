import { describe, expect, it } from "vitest"

import {
  calculateMetricBarPercents,
  formatMetricValue,
  parseMetricInput,
} from "@/lib/metric-format"

const daysAfter = {
  unit: "days",
  unitPosition: "after" as const,
  unitSpacing: "space" as const,
  precision: 1 as const,
}

describe("formatMetricValue", () => {
  it("renders null as an em dash without a unit", () => {
    expect(formatMetricValue(null, daysAfter)).toBe("—")
  })

  it("keeps trailing zeros from toFixed and places the unit after with a space", () => {
    expect(formatMetricValue(5, daysAfter)).toBe("5.0 days")
  })

  it("places the unit before with no spacing", () => {
    expect(
      formatMetricValue(12, {
        unit: "$",
        unitPosition: "before",
        unitSpacing: "none",
        precision: 0,
      })
    ).toBe("$12")
  })

  it("does not add spacing when the unit is empty", () => {
    expect(
      formatMetricValue(1.2, {
        unit: "",
        unitPosition: "after",
        unitSpacing: "space",
        precision: 2,
      })
    ).toBe("1.20")
  })
})

describe("calculateMetricBarPercents", () => {
  it("scales the smaller value against the larger as 100%", () => {
    expect(calculateMetricBarPercents(9.4, 5.1)).toEqual({
      baseline: 100,
      candidate: 54,
    })
  })

  it("treats a positive side against null as 100% versus 0%", () => {
    expect(calculateMetricBarPercents(5, null)).toEqual({
      baseline: 100,
      candidate: 0,
    })
    expect(calculateMetricBarPercents(null, 5)).toEqual({
      baseline: 0,
      candidate: 100,
    })
  })

  it("keeps both bars at 0% when either side is zero against null, or both are zero", () => {
    expect(calculateMetricBarPercents(0, null)).toEqual({
      baseline: 0,
      candidate: 0,
    })
    expect(calculateMetricBarPercents(null, 0)).toEqual({
      baseline: 0,
      candidate: 0,
    })
    expect(calculateMetricBarPercents(0, 0)).toEqual({
      baseline: 0,
      candidate: 0,
    })
  })
})

describe("parseMetricInput", () => {
  it("commits blank input as empty/null", () => {
    expect(parseMetricInput("")).toEqual({ status: "empty", value: null })
    expect(parseMetricInput("  ")).toEqual({ status: "empty", value: null })
  })

  it("accepts finite non-negative numbers including zero", () => {
    expect(parseMetricInput("0")).toEqual({ status: "valid", value: 0 })
    expect(parseMetricInput("1.20")).toEqual({ status: "valid", value: 1.2 })
  })

  it("rejects negative, non-numeric, and non-finite input", () => {
    expect(parseMetricInput("-1").status).toBe("invalid")
    expect(parseMetricInput("abc").status).toBe("invalid")
    expect(parseMetricInput("Infinity").status).toBe("invalid")
  })
})
