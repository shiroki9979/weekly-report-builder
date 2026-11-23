import { describe, expect, it } from "vitest"
import {
  isFullWidthPanelPage,
  isStructuredPage,
  parseDeck,
  type Deck,
  type FullWidthPanelPage,
} from "@/lib/deck"
import {
  assessContentReadiness,
  assessExportEligibility,
} from "@/lib/export-readiness"
import { createStagePageContext } from "@/lib/stage-page-context"
import { createBlankAddablePage } from "@/lib/page-lifecycle"
import { createDeckFromTemplate } from "@/lib/deck-template"

function firstPanelPage(deck: Deck): FullWidthPanelPage {
  const page = deck.pages[0]
  if (!isFullWidthPanelPage(page)) {
    throw new Error("expected full-width-panel page")
  }
  return page
}

const tablePage = {
  id: "checks",
  layout: "full-width-panel",
  title: "What the fictional pilot verified",
  panel: {
    kind: "table",
    title: "",
    columns: ["Check", "Result", "Page"],
    rows: [{ cells: ["Cold export", "Passed", "3"] }],
  },
}

describe("Full-width Panel", () => {
  it("parses a supported editorial page and normalizes its panel", () => {
    const page = firstPanelPage(
      parseDeck({
        pages: [
          {
            ...tablePage,
            boundary: "Fictional sample",
            extra: true,
            panel: { ...tablePage.panel, extra: true },
          },
        ],
      })
    )

    expect(isStructuredPage(page)).toBe(true)
    expect(page).toMatchObject({ ...tablePage, boundary: "Fictional sample" })
    expect(page).not.toHaveProperty("extra")
    expect(page.panel).not.toHaveProperty("extra")
  })

  it("preserves a data-column reference and rejects invalid supplied indices", () => {
    const withReference = (referenceColumn: unknown) => ({
      pages: [{ ...tablePage, panel: { ...tablePage.panel, referenceColumn } }],
    })
    expect(firstPanelPage(parseDeck(withReference(2))).panel).toMatchObject({
      referenceColumn: 2,
    })
    for (const index of [-1, 3, 0.5, "2", null]) {
      expect(() => parseDeck(withReference(index))).toThrow(/referenceColumn/)
    }
    expect(() =>
      parseDeck({
        pages: [
          { ...tablePage, panel: { kind: "fields", title: "", rows: [] } },
        ],
      })
    ).toThrow(/fields/)
  })

  it("exports each supported panel without a panel title or narrative items", () => {
    for (const panel of [
      tablePage.panel,
      { kind: "flow", title: "", steps: [{ label: "Review" }] },
      {
        kind: "checklist",
        title: "",
        items: [{ label: "Verify", checked: true }],
      },
      {
        kind: "chart",
        title: "",
        categories: ["Pilot"],
        series: [{ name: "Verified", values: [3] }],
      },
    ]) {
      const deck = parseDeck({ pages: [{ ...tablePage, panel }] })
      expect(assessExportEligibility(deck.pages[0], { status: "fit" })).toEqual(
        { eligible: true, issues: [] }
      )
      expect(createStagePageContext("harbor", deck, "checks").footer).toEqual({
        position: { index: 1, total: 1 },
      })
    }
    const incomplete = parseDeck({
      pages: [
        {
          ...tablePage,
          title: "",
          panel: { ...tablePage.panel, rows: [{ cells: ["", "Passed", "3"] }] },
        },
      ],
    }).pages[0]
    if (!isStructuredPage(incomplete))
      throw new Error("Expected structured page")
    expect(
      assessContentReadiness(incomplete).map((issue) => issue.path)
    ).toEqual(["title", "panel.rows[0].cells[0]"])
  })

  it("creates valid panel drafts and keeps the reference structure through a Deck Template", () => {
    for (const kind of ["table", "chart", "flow", "checklist"] as const) {
      const blank = createBlankAddablePage("draft", "full-width-panel", kind)
      expect(parseDeck({ pages: [blank] }).pages[0]).toMatchObject({
        layout: "full-width-panel",
        title: "",
        panel: { kind, title: "" },
      })
    }
    const source = parseDeck({
      theme: "observatory",
      pages: [
        {
          ...tablePage,
          boundary: "One sample",
          notes: "Discussion",
          panel: { ...tablePage.panel, referenceColumn: 2 },
        },
      ],
    })
    const template = createDeckFromTemplate(source)
    expect(template.pages[0]).toMatchObject({
      title: "",
      panel: {
        title: "",
        columns: ["", "", ""],
        rows: [{ cells: ["", "", ""] }],
        referenceColumn: 2,
      },
    })
    expect(firstPanelPage(template).boundary).toBeUndefined()
    expect(template.pages[0].notes).toBeUndefined()
    expect(parseDeck(template).pages[0].layout).toBe("full-width-panel")
  })
})
