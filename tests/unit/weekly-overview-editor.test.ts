import { describe, expect, it } from "vitest"

import { createBlankWeeklyOverviewPage } from "@/lib/page-lifecycle"
import {
  addSupportingOutcome,
  makeLead,
  moveSupportingOutcome,
  removeSupportingOutcome,
  setOverviewLeadField,
  setOverviewLeadStatus,
  setOverviewSupportingField,
  setOverviewSupportingStatus,
} from "@/lib/weekly-overview-editor"
import type { WeekDocument, WeeklyOverviewPage } from "@/lib/week-document"

function weekWith(page: WeeklyOverviewPage): WeekDocument {
  return {
    start: "2026-08-24",
    end: "2026-08-28",
    pages: [page],
  }
}

function overview(week: WeekDocument): WeeklyOverviewPage {
  const page = week.pages[0]
  if (page.layout !== "weekly-overview") {
    throw new Error("expected weekly-overview")
  }
  return page
}

describe("weekly overview editor", () => {
  it("updates lead and supporting text and status fields", () => {
    const week = weekWith(createBlankWeeklyOverviewPage("p01"))

    const withLead = setOverviewLeadStatus(
      setOverviewLeadField(week, 0, "workstream", "Delivery"),
      0,
      "label",
      "On track"
    )
    const withTone = setOverviewLeadStatus(withLead, 0, "tone", "positive")
    const withSupport = setOverviewSupportingStatus(
      setOverviewSupportingField(withTone, 0, 1, "figure", "18%"),
      0,
      1,
      "tone",
      "caution"
    )

    expect(overview(withSupport).lead.workstream).toBe("Delivery")
    expect(overview(withSupport).lead.status).toEqual({
      label: "On track",
      tone: "positive",
    })
    expect(overview(withSupport).supporting[1].figure).toBe("18%")
    expect(overview(withSupport).supporting[1].status.tone).toBe("caution")
  })

  it("adds a supporting outcome until the maximum of three", () => {
    const week = weekWith(createBlankWeeklyOverviewPage("p01"))
    const added = addSupportingOutcome(week, 0)

    expect(overview(added).supporting).toHaveLength(3)
    expect(overview(added).supporting[2]).toEqual({
      workstream: "",
      figure: "",
      result: "",
      impact: "",
      status: { label: "", tone: "neutral" },
    })
    expect(() => addSupportingOutcome(added, 0)).toThrow(/3/)
  })

  it("removes a supporting outcome until the minimum of one", () => {
    const week = weekWith(createBlankWeeklyOverviewPage("p01"))
    const removed = removeSupportingOutcome(week, 0, 0)

    expect(overview(removed).supporting).toHaveLength(1)
    expect(() => removeSupportingOutcome(removed, 0, 0)).toThrow(/1/)
  })

  it("reorders supporting outcomes and swaps a supporting outcome into the lead", () => {
    const week = weekWith(createBlankWeeklyOverviewPage("p01"))
    const named = setOverviewSupportingField(
      setOverviewSupportingField(
        setOverviewLeadField(week, 0, "workstream", "Delivery"),
        0,
        0,
        "workstream",
        "Accuracy"
      ),
      0,
      1,
      "workstream",
      "Stability"
    )
    const moved = moveSupportingOutcome(named, 0, 0, 1)

    expect(overview(moved).supporting.map((entry) => entry.workstream)).toEqual(
      ["Stability", "Accuracy"]
    )

    const swapped = makeLead(moved, 0, 1)
    expect(overview(swapped).lead.workstream).toBe("Accuracy")
    expect(
      overview(swapped).supporting.map((entry) => entry.workstream)
    ).toEqual(["Stability", "Delivery"])
  })
})
