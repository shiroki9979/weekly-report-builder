import { describe, expect, it } from "vitest"

import { contentReadinessHeading } from "@/lib/content-readiness-copy"

describe("contentReadinessHeading", () => {
  it("names a Draft Page when required content is missing", () => {
    expect(
      contentReadinessHeading([
        {
          code: "missing-content",
          path: "title",
          message: "Title is required",
        },
      ])
    ).toBe("Draft Page — missing required content")
  })

  it("does not call invalid Comparison Metric input a Draft Page", () => {
    expect(
      contentReadinessHeading([
        {
          code: "invalid-content",
          path: "metrics[0].baselineValue",
          message: "Metric value must be a finite non-negative number",
        },
      ])
    ).toBe("Invalid Comparison Metric input")
  })

  it("names both Draft Page and invalid Comparison Metric input when mixed", () => {
    expect(
      contentReadinessHeading([
        {
          code: "missing-content",
          path: "title",
          message: "Title is required",
        },
        {
          code: "invalid-content",
          path: "metrics[0].baselineValue",
          message: "Metric value must be a finite non-negative number",
        },
      ])
    ).toBe(
      "Draft Page — missing required content; invalid Comparison Metric input"
    )
  })
})
