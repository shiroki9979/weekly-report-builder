import { describe, expect, it } from "vitest"

import { assessContentReadiness } from "@/lib/export-readiness"
import {
  addCommitment,
  moveCommitment,
  removeCommitment,
  setCommitmentField,
} from "@/lib/next-actions-editor"
import { createBlankNextActionsPage } from "@/lib/page-lifecycle"
import { cloneWeekFromPrevious } from "@/lib/week-clone"
import { parseWeekDocument } from "@/lib/week-document"
import type { NextActionsPage, WeekDocument } from "@/lib/week-document"

function weekWith(page: NextActionsPage): WeekDocument {
  return { start: "2026-08-24", end: "2026-08-28", pages: [page] }
}

function actions(week: WeekDocument): NextActionsPage {
  const page = week.pages[0]
  if (page.layout !== "next-actions") {
    throw new Error("expected next-actions")
  }
  return page
}

describe("next-actions schema", () => {
  it("parses a draft and strips extra fields", () => {
    const doc = parseWeekDocument({
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          id: "p01",
          layout: "next-actions",
          title: "Five-day reviews.",
          extra: "drop",
          commitments: [
            {
              title: "Stabilize the review queue",
              outcome: "Changes land within five days.",
              checkpoint: "Median wait ≤ 5 days next Friday.",
              extra: true,
            },
            {
              title: "Hold the reserve",
              outcome: "Use stays below 25%.",
              checkpoint: "Reserve report signed before the next release.",
            },
          ],
        },
      ],
    })

    expect(doc.pages[0]).toEqual({
      id: "p01",
      layout: "next-actions",
      title: "Five-day reviews.",
      commitments: [
        {
          title: "Stabilize the review queue",
          outcome: "Changes land within five days.",
          checkpoint: "Median wait ≤ 5 days next Friday.",
        },
        {
          title: "Hold the reserve",
          outcome: "Use stays below 25%.",
          checkpoint: "Reserve report signed before the next release.",
        },
      ],
    })
  })

  it("rejects commitment cardinality outside 2–4", () => {
    const commitment = { title: "", outcome: "", checkpoint: "" }

    expect(() =>
      parseWeekDocument({
        start: "2026-08-24",
        end: "2026-08-28",
        pages: [
          {
            id: "p01",
            layout: "next-actions",
            title: "",
            commitments: [commitment],
          },
        ],
      })
    ).toThrow(/commitments/i)

    expect(() =>
      parseWeekDocument({
        start: "2026-08-24",
        end: "2026-08-28",
        pages: [
          {
            id: "p01",
            layout: "next-actions",
            title: "",
            commitments: [
              commitment,
              commitment,
              commitment,
              commitment,
              commitment,
            ],
          },
        ],
      })
    ).toThrow(/commitments/i)
  })
})

describe("next-actions factory and editor", () => {
  it("creates three blank commitments", () => {
    const page = createBlankNextActionsPage("p02")
    expect(page.commitments).toEqual([
      { title: "", outcome: "", checkpoint: "" },
      { title: "", outcome: "", checkpoint: "" },
      { title: "", outcome: "", checkpoint: "" },
    ])
  })

  it("enforces commitment bounds and updates fields", () => {
    const week = weekWith(createBlankNextActionsPage("p01"))
    const four = addCommitment(week, 0)
    expect(actions(four).commitments).toHaveLength(4)
    expect(() => addCommitment(four, 0)).toThrow(/4/)

    const two = removeCommitment(week, 0, 2)
    expect(actions(two).commitments).toHaveLength(2)
    expect(() => removeCommitment(two, 0, 0)).toThrow(/2/)

    const updated = setCommitmentField(two, 0, 0, "title", "Hold the reserve")
    expect(actions(updated).commitments[0].title).toBe("Hold the reserve")

    const labeled = setCommitmentField(week, 0, 0, "title", "First")
    const swapped = moveCommitment(labeled, 0, 0, 2)
    expect(
      actions(swapped).commitments.map((commitment) => commitment.title)
    ).toEqual(["", "", "First"])
  })
})

describe("next-actions clone and readiness", () => {
  it("keeps commitment count and clears weekly copy", () => {
    const previous = parseWeekDocument({
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          id: "p01",
          layout: "next-actions",
          title: "Five-day reviews.",
          notes: "talk",
          commitments: [
            {
              title: "Stabilize the review queue",
              outcome: "Changes land within five days.",
              checkpoint: "Median wait ≤ 5 days next Friday.",
            },
            {
              title: "Hold the reserve",
              outcome: "Use stays below 25%.",
              checkpoint: "Reserve report signed before the next release.",
            },
          ],
        },
      ],
    })
    const cloned = cloneWeekFromPrevious(previous, "2026-08-31")
    const page = cloned.pages[0]
    if (page.layout !== "next-actions") {
      throw new Error("expected next-actions")
    }
    expect(page.title).toBe("")
    expect(page.notes).toBeUndefined()
    expect(page.commitments).toEqual([
      { title: "", outcome: "", checkpoint: "" },
      { title: "", outcome: "", checkpoint: "" },
    ])
  })

  it("lists missing commitment fields after title", () => {
    const issues = assessContentReadiness(createBlankNextActionsPage("p01"))
    expect(issues.map((issue) => issue.path)).toEqual([
      "title",
      "commitments[0].title",
      "commitments[0].outcome",
      "commitments[0].checkpoint",
      "commitments[1].title",
      "commitments[1].outcome",
      "commitments[1].checkpoint",
      "commitments[2].title",
      "commitments[2].outcome",
      "commitments[2].checkpoint",
    ])
  })
})
