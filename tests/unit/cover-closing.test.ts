import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { parseDeck, isStructuredPage } from "@/lib/deck"
import {
  assessContentReadiness,
  assessExportEligibility,
} from "@/lib/export-readiness"
import { createStagePageContext } from "@/lib/stage-page-context"
import { createBlankAddablePage } from "@/lib/page-lifecycle"
import { createDeckFromTemplate } from "@/lib/deck-template"

describe("Cover and Closing contracts", () => {
  it("normalizes a title-only Cover and drops Boundary Note", () => {
    const deck = parseDeck({
      pages: [
        {
          id: "cover",
          layout: "cover",
          title: "Harbor pilot",
          boundary: "Not supported",
          extra: "discard",
        },
      ],
    })
    expect(deck.pages[0]).toMatchObject({
      layout: "cover",
      title: "Harbor pilot",
      subtitle: "",
      byline: "",
    })
    expect(deck.pages[0]).not.toHaveProperty("boundary")
    expect(deck.pages[0]).not.toHaveProperty("extra")
  })
  it("accepts Boundary Note only on Editorial Frame pages and validates Closing takeaways", () => {
    const demo = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../../demo/2026-01-05.json"),
        "utf8"
      )
    )
    const deck = parseDeck({
      pages: demo.pages.map((page: object) => ({
        ...page,
        boundary: "Fictional sample only.",
      })),
    })
    for (const page of deck.pages) {
      if (
        [
          "overview",
          "evidence-decision",
          "next-actions",
          "trend-target",
        ].includes(page.layout)
      )
        expect(page).toHaveProperty("boundary", "Fictional sample only.")
      else expect(page).not.toHaveProperty("boundary")
    }
    const closing = {
      id: "last",
      layout: "closing",
      title: "Continue the pilot",
      takeaways: [],
      boundary: "Scope",
    }
    expect(parseDeck({ pages: [closing] }).pages[0]).toMatchObject({
      eyebrow: "",
      closingLine: "",
      takeaways: [],
      boundary: "Scope",
    })
    expect(() =>
      parseDeck({
        pages: [
          {
            ...closing,
            takeaways: Array.from({ length: 5 }, () => ({ text: "Point" })),
          },
        ],
      })
    ).toThrow(/0 to 4 entries/)
    expect(() =>
      parseDeck({ pages: [{ ...closing, takeaways: [{ text: 1 }] }] })
    ).toThrow(/takeaways\[0\].text/)
  })
  it("counts Cover without drawing its number and assesses only required content", () => {
    const deck = parseDeck({
      pages: [
        { id: "first", layout: "cover", title: "Harbor", showPageNumber: true },
        {
          id: "last",
          layout: "closing",
          title: "Continue",
          takeaways: [],
          boundary: "",
        },
      ],
    })
    expect(createStagePageContext("pilot", deck, "first")).toMatchObject({
      position: { index: 1, total: 2 },
      showPageNumber: false,
    })
    expect(createStagePageContext("pilot", deck, "last")).toMatchObject({
      position: { index: 2, total: 2 },
      showPageNumber: true,
    })
    for (const page of deck.pages) {
      expect(isStructuredPage(page)).toBe(true)
      if (!isStructuredPage(page)) throw new Error("Expected Structured Page")
      expect(assessContentReadiness(page)).toEqual([])
      expect(assessExportEligibility(page, { status: "fit" }).eligible).toBe(
        true
      )
      expect(assessContentReadiness({ ...page, title: " " })).toEqual([
        {
          code: "missing-content",
          path: "title",
          message: "Title is required",
        },
      ])
    }
    const last = parseDeck({
      pages: [
        {
          id: "last",
          layout: "closing",
          title: "Continue",
          takeaways: [{ ref: "02", text: " " }],
        },
      ],
    }).pages[0]
    expect(assessExportEligibility(last, { status: "fit" }).issues).toEqual([
      {
        code: "missing-content",
        path: "takeaways[0].text",
        message: "Takeaway text is required",
      },
    ])
  })
  it("creates valid drafts and retains only stable Cover and Closing copy in templates", () => {
    const blanks = ["cover", "closing"] as const
    for (const layout of blanks) {
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
    const demo = parseDeck(
      JSON.parse(
        readFileSync(
          resolve(import.meta.dirname, "../../demo/2026-01-05.json"),
          "utf8"
        )
      )
    )
    const reused = createDeckFromTemplate({
      ...demo,
      pages: demo.pages.map((page) => ({ ...page, boundary: "Old caveat" })),
    })
    expect(reused.pages.every((page) => page.boundary === undefined)).toBe(true)
  })
})
