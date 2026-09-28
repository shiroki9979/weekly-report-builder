import { describe, expect, it } from "vitest"

import {
  assertCanAddEntry,
  assertCanRemoveEntry,
  canAddEntry,
  CARDINALITY,
  parseWeekDocument,
  type Cardinality,
} from "@/lib/week-document"

describe("cardinality rules", () => {
  it("names the limit with a plural noun when it is more than one", () => {
    expect(() =>
      assertCanAddEntry([1, 2], CARDINALITY.comparisonMetrics)
    ).toThrow("Evidence-backed Decision can have at most 2 metrics")
    expect(() => assertCanRemoveEntry([1, 2], CARDINALITY.commitments)).toThrow(
      "Next Actions must keep at least 2 commitments"
    )
  })

  it("names the limit with a singular noun when it is exactly one", () => {
    expect(() =>
      assertCanRemoveEntry([1], CARDINALITY.supportingOutcomes)
    ).toThrow("Weekly Overview must keep at least 1 supporting outcome")
  })

  it("uses the irregular plural a rule declares", () => {
    const rule: Cardinality = {
      min: 2,
      owner: "Chart",
      noun: "category",
      plural: "categories",
    }

    expect(() => assertCanRemoveEntry([1, 2], rule)).toThrow(
      "Chart must keep at least 2 categories"
    )
  })

  it("always allows adding to a rule without an upper limit", () => {
    const unbounded: Cardinality = { min: 1, owner: "Table", noun: "row" }
    const manyRows = Array.from({ length: 500 }, () => ({ cells: [] }))

    expect(canAddEntry(manyRows, unbounded)).toBe(true)
    expect(() => assertCanAddEntry(manyRows, unbounded)).not.toThrow()
    expect(canAddEntry(manyRows, CARDINALITY.tableRows)).toBe(true)
  })

  it("reports an exact Two-column item count in the parser error", () => {
    expect(() =>
      parseWeekDocument({
        start: "2026-08-24",
        end: "2026-08-28",
        pages: [
          {
            id: "p01",
            layout: "two-column",
            title: "Too few items",
            items: [{ heading: "A", body: "1" }],
            panel: { kind: "flow", title: "Flow", steps: [] },
          },
        ],
      })
    ).toThrow("Invalid week document: pages[0].items must have 3 entries")
  })
})
