import { describe, expect, it } from "vitest"
import { parseDeck, isStructuredPage } from "@/lib/deck"

import {
  assessContentReadiness,
  assessExportEligibility,
} from "@/lib/export-readiness"
import { createStagePageContext } from "@/lib/stage-page-context"

import { createBlankAddablePage } from "@/lib/page-lifecycle"
import { createDeckFromTemplate } from "@/lib/deck-template"

const comparison = {
  id: "compare",
  layout: "side-by-side",
  title: "Cache rendered pages",
  columns: [
    { label: "Cached renders", points: ["Reuse unchanged pages"] },
    { label: "Per-page capture", points: ["No cache state"] },
  ],
}

describe("Side-by-side Comparison", () => {
  it("normalizes declared fields while retaining chosen, tradeoff and Boundary Note", () => {
    const deck = parseDeck({
      pages: [
        {
          ...comparison,
          chosen: 0,
          tradeoff: {
            why: "Reviewers repeat exports",
            cost: "Cache invalidation",
            extra: true,
          },
          boundary: "Fictional pilot only",
          extra: true,
        },
      ],
    })
    expect(deck.pages[0]).toMatchObject({
      ...comparison,
      chosen: 0,
      tradeoff: { why: "Reviewers repeat exports", cost: "Cache invalidation" },
      boundary: "Fictional pilot only",
    })
    expect(deck.pages[0]).not.toHaveProperty("extra")
    expect(deck.pages[0].tradeoff).not.toHaveProperty("extra")
  })

  it("accepts an open comparison without chosen or tradeoff", () => {
    const page = parseDeck({ pages: [comparison] }).pages[0]
    if (!isStructuredPage(page)) throw new Error("Expected a Structured Page")

    expect(assessContentReadiness(page)).toEqual([])
    expect(assessExportEligibility(page, { status: "fit" }).eligible).toBe(true)
  })

  it("numbers a comparison page by its Page Position", () => {
    const deck = parseDeck({ pages: [comparison] })

    const context = createStagePageContext("pilot", deck, comparison.id)

    expect(context).toMatchObject({
      position: { index: 1, total: 1 },
      showPageNumber: true,
    })
  })

  it("reports each missing visible field by path", () => {
    const incomplete = parseDeck({
      pages: [
        {
          ...comparison,
          title: "",
          columns: [
            { label: "", points: ["Valid", " "] },
            { label: "Right", points: ["Valid"] },
          ],
          tradeoff: { why: " ", cost: "Storage" },
        },
      ],
    }).pages[0]
    if (!isStructuredPage(incomplete))
      throw new Error("Expected a Structured Page")

    const paths = assessContentReadiness(incomplete).map((issue) => issue.path)

    expect(paths).toEqual([
      "title",
      "columns[0].label",
      "columns[0].points[1]",
      "tradeoff.why",
    ])
  })

  it("creates a schema-valid blank draft", () => {
    const blank = createBlankAddablePage("draft", "side-by-side", "table")
    expect(parseDeck({ pages: [blank] }).pages[0]).toMatchObject({
      layout: "side-by-side",
      title: "",
      columns: [
        { label: "", points: [""] },
        { label: "", points: [""] },
      ],
    })
  })

  it("clears comparison copy in a Deck Template without losing point slots", () => {
    const source = parseDeck({
      pages: [
        {
          ...comparison,
          columns: [
            { label: "Cache", points: ["Reuse", "Store"] },
            { label: "Capture", points: ["Render"] },
          ],
          chosen: 1,
          tradeoff: { why: "No state" },
          boundary: "Pilot",
          notes: "Discussion",
        },
      ],
    })
    const template = createDeckFromTemplate(source)
    expect(template.pages[0]).toMatchObject({
      title: "",
      columns: [
        { label: "", points: ["", ""] },
        { label: "", points: [""] },
      ],
    })
    expect(template.pages[0].chosen).toBeUndefined()
    expect(template.pages[0].tradeoff).toBeUndefined()
    expect(template.pages[0].boundary).toBeUndefined()
    expect(template.pages[0].notes).toBeUndefined()
    expect(parseDeck(template).pages[0]).toMatchObject({
      layout: "side-by-side",
    })
  })

  it("rejects cardinality and chosen violations at the Deck boundary", () => {
    for (const columns of [
      [],
      comparison.columns.slice(0, 1),
      [...comparison.columns, comparison.columns[0]],
    ]) {
      expect(() => parseDeck({ pages: [{ ...comparison, columns }] })).toThrow(
        /columns.*2/
      )
    }
    for (const points of [[], Array.from({ length: 5 }, () => "Point")]) {
      expect(() =>
        parseDeck({
          pages: [
            {
              ...comparison,
              columns: [{ label: "Left", points }, comparison.columns[1]],
            },
          ],
        })
      ).toThrow(/points.*1 to 4/)
    }
    for (const chosen of [-1, 2, 0.5, "0", null]) {
      expect(() => parseDeck({ pages: [{ ...comparison, chosen }] })).toThrow(
        /chosen/
      )
    }
    expect(() =>
      parseDeck({
        pages: [{ ...comparison, tradeoff: { cost: "No reason field" } }],
      })
    ).toThrow(/tradeoff.why/)
  })
})
