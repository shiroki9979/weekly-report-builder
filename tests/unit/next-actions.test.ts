import { describe, expect, it } from "vitest"

import { assessContentReadiness } from "@/lib/export-readiness"
import {
  addCommitment,
  moveCommitment,
  removeCommitment,
  setCommitmentField,
  setNextActionsVariant,
} from "@/lib/next-actions-editor"
import { createBlankNextActionsPage } from "@/lib/page-lifecycle"
import { createDeckFromTemplate } from "@/lib/deck-template"
import { parseDeck } from "@/lib/deck"
import type { NextActionsPage, Deck } from "@/lib/deck"

function weekWith(page: NextActionsPage): Deck {
  return { start: "2026-08-24", end: "2026-08-28", pages: [page] }
}

function actions(week: Deck): NextActionsPage {
  const page = week.pages[0]
  if (page.layout !== "next-actions") {
    throw new Error("expected next-actions")
  }
  return page
}

describe("next-actions schema", () => {
  it("reads omitted variants as Columns and rejects invalid supplied variants", () => {
    const source = {
      period: { start: "2026-08-24", end: "2026-08-28" },
      pages: [
        {
          id: "p01",
          layout: "next-actions",
          title: "Plan",
          commitments: [
            { title: "One", outcome: "First", checkpoint: "Done" },
            { title: "Two", outcome: "Second", checkpoint: "Done" },
          ],
        },
      ],
    }
    expect(actions(parseDeck(source)).variant).toBe("columns")
    expect(
      actions(
        parseDeck({
          ...source,
          pages: [{ ...source.pages[0], variant: "rows" }],
        })
      ).variant
    ).toBe("rows")
    expect(() =>
      parseDeck({
        ...source,
        pages: [{ ...source.pages[0], variant: "grid" }],
      })
    ).toThrow(/variant/)
  })

  it("parses a draft and strips extra fields", () => {
    const doc = parseDeck({
      period: { start: "2026-08-24", end: "2026-08-28" },
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
      variant: "columns",
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
      parseDeck({
        period: { start: "2026-08-24", end: "2026-08-28" },
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
      parseDeck({
        period: { start: "2026-08-24", end: "2026-08-28" },
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
    expect(page.variant).toBe("rows")
    expect(page.commitments).toEqual([
      { title: "", outcome: "", checkpoint: "" },
      { title: "", outcome: "", checkpoint: "" },
      { title: "", outcome: "", checkpoint: "" },
    ])
  })

  it("switches composition without changing authored commitments or metadata", () => {
    const initial = createBlankNextActionsPage("p01")
    const authored = {
      ...initial,
      title: "Plan",
      notes: "Talk",
      commitments: [
        { title: "One", outcome: "First", checkpoint: "At noon" },
        { title: "Two", outcome: "Second", checkpoint: "On Friday" },
      ],
    }
    const changed = actions(
      setNextActionsVariant(weekWith(authored), 0, "columns")
    )
    expect(changed).toEqual({ ...authored, variant: "columns" })
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
    const previous = parseDeck({
      period: { start: "2026-08-24", end: "2026-08-28" },
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
    const cloned = createDeckFromTemplate(previous)
    const page = cloned.pages[0]
    if (page.layout !== "next-actions") {
      throw new Error("expected next-actions")
    }
    expect(page.title).toBe("")
    expect(page.variant).toBe("columns")
    expect(page.notes).toBeUndefined()
    expect(page.commitments).toEqual([
      { title: "", outcome: "", checkpoint: "" },
      { title: "", outcome: "", checkpoint: "" },
    ])
  })

  it("retains Rows after cloning and parsing the next week", () => {
    const previous = weekWith({
      ...createBlankNextActionsPage("p01"),
      title: "Next steps",
    })
    const cloned = createDeckFromTemplate(previous)
    expect(actions(parseDeck(cloned)).variant).toBe("rows")
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
