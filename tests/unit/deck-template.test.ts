import { describe, expect, it } from "vitest"

import { createDeckFromTemplate } from "@/lib/deck-template"
import { parseDeck } from "@/lib/deck"

const template = parseDeck({
  showPageNumbers: false,
  pages: [
    {
      id: "p01",
      layout: "next-actions",
      variant: "rows",
      title: "Roadmap",
      notes: "Say this aloud",
      hidden: true,
      commitments: [
        { title: "Ship", outcome: "Live", checkpoint: "Q4" },
        { title: "Measure", outcome: "Baseline", checkpoint: "Q1" },
      ],
    },
    {
      id: "p02",
      layout: "html",
      title: "Custom",
      htmlFile: "p02.html",
      showPageNumber: true,
    },
  ],
})

describe("createDeckFromTemplate", () => {
  it("keeps structure and clears authored copy without needing a period", () => {
    const deck = createDeckFromTemplate(template)

    expect(deck).not.toHaveProperty("period")
    expect(deck.pages.map((page) => [page.id, page.layout])).toEqual([
      ["p01", "next-actions"],
      ["p02", "html"],
    ])
    expect(deck.pages.every((page) => page.title === "")).toBe(true)
    expect(deck.pages[0]).toMatchObject({
      variant: "rows",
      hidden: true,
      notes: undefined,
      commitments: [
        { title: "", outcome: "", checkpoint: "" },
        { title: "", outcome: "", checkpoint: "" },
      ],
    })
    expect(deck.pages[1]).toMatchObject({
      htmlFile: "p02.html",
      showPageNumber: true,
    })
  })

  it("resets the deck page-number default and applies a requested period", () => {
    const deck = createDeckFromTemplate(template, {
      period: { start: "2026-10-01", end: "2026-12-31" },
    })

    expect(deck.showPageNumbers).toBeUndefined()
    expect(deck.period).toEqual({ start: "2026-10-01", end: "2026-12-31" })
  })

  it("does not mutate the template", () => {
    const before = structuredClone(template)
    createDeckFromTemplate(template)
    expect(template).toEqual(before)
  })
})
