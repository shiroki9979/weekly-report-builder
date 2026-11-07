import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { parseDeck, isStructuredPage, type Page } from "@/lib/deck"
import {
  assessContentReadiness,
  assessExportEligibility,
} from "@/lib/export-readiness"
import { createStagePageContext } from "@/lib/stage-page-context"
import { createBlankAddablePage } from "@/lib/page-lifecycle"
import { createDeckFromTemplate } from "@/lib/deck-template"

function readDemoWeek(): { pages: Page[] } {
  return JSON.parse(
    readFileSync(
      resolve(import.meta.dirname, "../../demo/2026-01-05.json"),
      "utf8"
    )
  )
}

const closing = {
  id: "last",
  layout: "closing",
  title: "Continue the pilot",
  takeaways: [],
}

const titledCoverAndClosing = parseDeck({
  pages: [
    { id: "first", layout: "cover", title: "Harbor", showPageNumber: true },
    { id: "last", layout: "closing", title: "Continue", takeaways: [] },
  ],
})

function structured(page: Page) {
  if (!isStructuredPage(page)) throw new Error("Expected Structured Page")
  return page
}

describe("Cover and Closing contracts", () => {
  it("normalizes a title-only Cover to its declared fields", () => {
    const deck = parseDeck({
      pages: [
        { id: "cover", layout: "cover", title: "Harbor pilot", extra: "x" },
      ],
    })

    expect(deck.pages[0]).toMatchObject({
      layout: "cover",
      title: "Harbor pilot",
      subtitle: "",
      byline: "",
    })
    expect(deck.pages[0]).not.toHaveProperty("extra")
  })

  it("drops a Boundary Note from a Cover", () => {
    const deck = parseDeck({
      pages: [
        { id: "cover", layout: "cover", title: "Pilot", boundary: "Scope" },
      ],
    })

    expect(deck.pages[0]).not.toHaveProperty("boundary")
  })

  it("keeps a Boundary Note only on Editorial Frame layouts", () => {
    const demo = readDemoWeek()

    const deck = parseDeck({
      pages: demo.pages.map((page) => ({
        ...page,
        boundary: "Fictional sample only.",
      })),
    })

    const editorial = [
      "overview",
      "evidence-decision",
      "next-actions",
      "trend-target",
    ]
    for (const page of deck.pages) {
      if (editorial.includes(page.layout))
        expect(page).toHaveProperty("boundary", "Fictional sample only.")
      else expect(page).not.toHaveProperty("boundary")
    }
  })

  it("fills omitted Closing text with empty strings", () => {
    const deck = parseDeck({ pages: [closing] })

    expect(deck.pages[0]).toMatchObject({
      eyebrow: "",
      closingLine: "",
      takeaways: [],
    })
  })

  it("keeps a Boundary Note on a Closing page", () => {
    const deck = parseDeck({ pages: [{ ...closing, boundary: "Scope" }] })

    expect(deck.pages[0]).toHaveProperty("boundary", "Scope")
  })

  it("reads a whitespace-only Boundary Note as absent", () => {
    const deck = parseDeck({ pages: [{ ...closing, boundary: "  " }] })

    expect(deck.pages[0]).not.toHaveProperty("boundary")
  })

  it("rejects more than four Closing takeaways", () => {
    const takeaways = Array.from({ length: 5 }, () => ({ text: "Point" }))

    expect(() => parseDeck({ pages: [{ ...closing, takeaways }] })).toThrow(
      /0 to 4 entries/
    )
  })

  it("rejects a takeaway whose text is not a string", () => {
    expect(() =>
      parseDeck({ pages: [{ ...closing, takeaways: [{ text: 1 }] }] })
    ).toThrow(/takeaways\[0\].text/)
  })

  it("counts Cover in the Page Position without drawing its number", () => {
    const cover = createStagePageContext(
      "pilot",
      titledCoverAndClosing,
      "first"
    )
    const last = createStagePageContext("pilot", titledCoverAndClosing, "last")

    expect(cover).toMatchObject({
      position: { index: 1, total: 2 },
      showPageNumber: false,
    })
    expect(last).toMatchObject({
      position: { index: 2, total: 2 },
      showPageNumber: true,
    })
  })

  it("treats a titled Cover or Closing as content-complete", () => {
    for (const page of titledCoverAndClosing.pages.map(structured)) {
      expect(assessContentReadiness(page)).toEqual([])
      expect(assessExportEligibility(page, { status: "fit" }).eligible).toBe(
        true
      )
    }
  })

  it("requires a visible title on Cover and Closing", () => {
    for (const page of titledCoverAndClosing.pages.map(structured)) {
      expect(assessContentReadiness({ ...page, title: " " })).toEqual([
        {
          code: "missing-content",
          path: "title",
          message: "Title is required",
        },
      ])
    }
  })

  it("requires text on every Closing takeaway", () => {
    const last = parseDeck({
      pages: [{ ...closing, takeaways: [{ ref: "02", text: " " }] }],
    }).pages[0]

    expect(assessExportEligibility(last, { status: "fit" }).issues).toEqual([
      {
        code: "missing-content",
        path: "takeaways[0].text",
        message: "Takeaway text is required",
      },
    ])
  })

  it("creates schema-valid Cover and Closing drafts that still need a title", () => {
    for (const layout of ["cover", "closing"] as const) {
      const blank = createBlankAddablePage("new", layout, "table")

      expect(parseDeck({ pages: [blank] }).pages[0]).toMatchObject(blank)
      expect(assessExportEligibility(blank, { status: "fit" }).issues).toEqual([
        {
          code: "missing-content",
          path: "title",
          message: "Title is required",
        },
      ])
    }
  })

  it("keeps only stable Cover and Closing copy in a Deck Template", () => {
    const deck = parseDeck({
      pages: [
        {
          id: "cover",
          layout: "cover",
          title: "Pilot",
          subtitle: "Report",
          byline: "Harbor team",
          notes: "notes",
        },
        {
          id: "closing",
          layout: "closing",
          title: "Continue",
          eyebrow: "Next",
          takeaways: [{ ref: "02", text: "Keep measuring" }],
          closingLine: "ops@example.test",
          boundary: "Pilot only",
          notes: "notes",
        },
      ],
    })

    const template = createDeckFromTemplate(deck)

    expect(template.pages[0]).toMatchObject({
      title: "",
      subtitle: "",
      byline: "Harbor team",
    })
    expect(template.pages[1]).toMatchObject({
      title: "",
      eyebrow: "",
      takeaways: [],
      closingLine: "ops@example.test",
    })
    expect(template.pages[1].boundary).toBeUndefined()
    expect(template.pages.every((page) => page.notes === undefined)).toBe(true)
  })

  it("clears every Boundary Note when reusing a Deck Template", () => {
    const demo = parseDeck(readDemoWeek())

    const reused = createDeckFromTemplate({
      ...demo,
      pages: demo.pages.map((page) => ({ ...page, boundary: "Old caveat" })),
    })

    expect(reused.pages.every((page) => page.boundary === undefined)).toBe(true)
  })
})
