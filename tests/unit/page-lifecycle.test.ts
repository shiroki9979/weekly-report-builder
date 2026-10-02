import { describe, expect, it } from "vitest"

import {
  addPageAfter,
  createBlankTwoColumnPage,
  createBlankOverviewPage,
  createBlankNextActionsPage,
  deleteSelectedPage,
  moveSelectedPage,
  nextPageId,
} from "@/lib/page-lifecycle"
import type { TwoColumnPage, Deck } from "@/lib/deck"

function htmlPage(id: string, title = id): Deck["pages"][number] {
  return {
    id,
    layout: "html",
    title,
    htmlFile: `${id}.html`,
  }
}

function weekWith(pages: Deck["pages"]): Deck {
  return {
    period: { start: "2026-08-24", end: "2026-08-28" },
    pages,
  }
}

describe("nextPageId", () => {
  it("starts at p01 when no pNN ids exist", () => {
    expect(nextPageId(["escape-hatch"])).toBe("p01")
  })

  it("increments the largest pNN and pads to at least two digits", () => {
    expect(nextPageId(["p09"])).toBe("p10")
    expect(nextPageId(["p99"])).toBe("p100")
  })

  it("skips collisions with existing custom or pNN ids", () => {
    expect(nextPageId(["p01", "p02"])).toBe("p03")
    expect(nextPageId(["p10"])).toBe("p11")
  })
})

describe("createBlankTwoColumnPage", () => {
  it("builds a blank table page with one column and one rectangular row", () => {
    const page = createBlankTwoColumnPage("p01", "table")

    expect(page).toEqual({
      id: "p01",
      layout: "two-column",
      title: "",
      items: [
        { heading: "", body: "" },
        { heading: "", body: "" },
        { heading: "", body: "" },
      ],
      panel: {
        kind: "table",
        title: "",
        columns: [""],
        rows: [{ cells: [""] }],
      },
    })
  })

  it("builds a blank chart page with one category and one series value", () => {
    const page = createBlankTwoColumnPage("p02", "chart")

    expect(page.panel).toEqual({
      kind: "chart",
      title: "",
      categories: [""],
      series: [{ name: "", values: [0] }],
    })
  })

  it("builds a blank flow page with one step", () => {
    const page = createBlankTwoColumnPage("p03", "flow")

    expect(page.panel).toEqual({
      kind: "flow",
      title: "",
      steps: [{ label: "" }],
    })
  })

  it("builds a blank checklist page with one item", () => {
    const page = createBlankTwoColumnPage("p04", "checklist")

    expect(page.panel).toEqual({
      kind: "checklist",
      title: "",
      items: [{ label: "" }],
    })
  })
})

describe("createBlankWeeklyOverviewPage", () => {
  it("builds one empty lead and two supporting outcomes with neutral tone", () => {
    const page = createBlankOverviewPage("p05")
    const blankOutcome = {
      workstream: "",
      figure: "",
      result: "",
      impact: "",
      status: { label: "", tone: "neutral" },
    }

    expect(page).toEqual({
      id: "p05",
      layout: "overview",
      title: "",
      lead: blankOutcome,
      supporting: [blankOutcome, blankOutcome],
    })
  })
})

describe("createBlankNextActionsPage", () => {
  it("builds three empty commitments", () => {
    const page = createBlankNextActionsPage("p06")
    expect(page).toEqual({
      id: "p06",
      layout: "next-actions",
      variant: "rows",
      title: "",
      commitments: [
        { title: "", outcome: "", checkpoint: "" },
        { title: "", outcome: "", checkpoint: "" },
        { title: "", outcome: "", checkpoint: "" },
      ],
    })
  })
})

describe("addPageAfter", () => {
  it("inserts the new page after the selected page and selects the new page", () => {
    const week = weekWith([htmlPage("p01", "First"), htmlPage("p02", "Second")])
    const added = createBlankTwoColumnPage("p03", "table")

    const result = addPageAfter(week, "p01", added)

    expect(result.deck.pages.map((page) => page.id)).toEqual([
      "p01",
      "p03",
      "p02",
    ])
    expect(result.selectedPageId).toBe("p03")
    expect(result.deck.pages[1]).toEqual(added)
  })
})

describe("deleteSelectedPage", () => {
  it("refuses to delete the last remaining page", () => {
    const week = weekWith([htmlPage("p01")])

    expect(() => deleteSelectedPage(week, "p01")).toThrow(/last page/i)
  })

  it("selects the next page after deleting the selected page", () => {
    const week = weekWith([
      htmlPage("p01", "First"),
      htmlPage("p02", "Second"),
      htmlPage("p03", "Third"),
    ])

    const result = deleteSelectedPage(week, "p02")

    expect(result.deck.pages.map((page) => page.id)).toEqual(["p01", "p03"])
    expect(result.selectedPageId).toBe("p03")
  })

  it("selects the previous page when the deleted page was last", () => {
    const week = weekWith([htmlPage("p01"), htmlPage("p02")])

    const result = deleteSelectedPage(week, "p02")

    expect(result.deck.pages.map((page) => page.id)).toEqual(["p01"])
    expect(result.selectedPageId).toBe("p01")
  })
})

describe("moveSelectedPage", () => {
  it("moves the selected page while keeping selection on the same page id", () => {
    const week = weekWith([htmlPage("p01"), htmlPage("p02"), htmlPage("p03")])

    const down = moveSelectedPage(week, "p02", "down")
    expect(down.deck.pages.map((page) => page.id)).toEqual([
      "p01",
      "p03",
      "p02",
    ])
    expect(down.selectedPageId).toBe("p02")

    const up = moveSelectedPage(week, "p02", "up")
    expect(up.deck.pages.map((page) => page.id)).toEqual(["p02", "p01", "p03"])
    expect(up.selectedPageId).toBe("p02")
  })

  it("is a no-op at the ends of the document", () => {
    const week = weekWith([htmlPage("p01"), htmlPage("p02")])

    expect(moveSelectedPage(week, "p01", "up")).toEqual({
      deck: week,
      selectedPageId: "p01",
    })
    expect(moveSelectedPage(week, "p02", "down")).toEqual({
      deck: week,
      selectedPageId: "p02",
    })
  })
})

describe("blank two-column pages remain drafts", () => {
  it("omits optional hidden and notes", () => {
    const page: TwoColumnPage = createBlankTwoColumnPage("p05", "table")

    expect(page.hidden).toBeUndefined()
    expect(page.notes).toBeUndefined()
  })
})
