import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import {
  cloneWeekFromPrevious,
  isMondayDate,
  latestWeekMonday,
  nextMondayAfter,
  weekRangeForMonday,
} from "@/lib/week-clone"
import { parseWeekDocument } from "@/lib/week-document"

const fixturePath = resolve(
  import.meta.dirname,
  "../fixtures/clone-previous-week.json"
)

function loadPreviousWeek() {
  return parseWeekDocument(JSON.parse(readFileSync(fixturePath, "utf-8")))
}

describe("week-clone", () => {
  it("names the new week file for the target Monday and Friday range", () => {
    expect(weekRangeForMonday("2026-08-31")).toEqual({
      start: "2026-08-31",
      end: "2026-09-04",
    })
    expect(isMondayDate("2026-08-31")).toBe(true)
    expect(isMondayDate("2026-09-01")).toBe(false)
  })

  it("picks the latest week and the following Monday", () => {
    expect(latestWeekMonday(["2026-08-17", "2026-08-24"])).toBe("2026-08-24")
    expect(nextMondayAfter("2026-08-24")).toBe("2026-08-31")
  })

  it("clones structure from the previous week with cleared copy", () => {
    const previous = loadPreviousWeek()
    const cloned = cloneWeekFromPrevious(previous, "2026-08-31")

    expect(cloned.start).toBe("2026-08-31")
    expect(cloned.end).toBe("2026-09-04")
    expect(cloned.pages).toHaveLength(previous.pages.length)

    expect(cloned.pages.map((page) => page.id)).toEqual(
      previous.pages.map((page) => page.id)
    )
    expect(cloned.pages.map((page) => page.panel.kind)).toEqual(
      previous.pages.map((page) => page.panel.kind)
    )
    expect(cloned.pages.map((page) => page.hidden)).toEqual(
      previous.pages.map((page) => page.hidden)
    )

    for (const page of cloned.pages) {
      expect(page.title).toBe("")
      expect(page.notes).toBeUndefined()
      expect(page.items).toHaveLength(3)
      for (const item of page.items) {
        expect(item.heading).toBe("")
        expect(item.body).toBe("")
      }
    }

    const chartPanel = cloned.pages[0].panel
    if (chartPanel.kind !== "chart") {
      throw new Error("expected chart panel")
    }
    expect(chartPanel.title).toBe("")
    expect(chartPanel.categories).toEqual(["", "", ""])
    expect(chartPanel.series).toHaveLength(2)
    expect(chartPanel.series[0].name).toBe("")
    expect(chartPanel.series[0].values).toEqual([0, 0, 0])

    const flowPanel = cloned.pages[1].panel
    if (flowPanel.kind !== "flow") {
      throw new Error("expected flow panel")
    }
    expect(flowPanel.steps).toHaveLength(2)
    expect(flowPanel.steps[0]).toEqual({
      label: "",
      caption: undefined,
      variant: "default",
    })

    const checklistPanel = cloned.pages[2].panel
    if (checklistPanel.kind !== "checklist") {
      throw new Error("expected checklist panel")
    }
    expect(checklistPanel.items).toEqual([
      { label: "", checked: undefined },
      { label: "", checked: undefined },
    ])

    const tablePanel = cloned.pages[3].panel
    if (tablePanel.kind !== "table") {
      throw new Error("expected table panel")
    }
    expect(tablePanel.columns).toEqual(["", "", ""])
    expect(tablePanel.rows).toEqual([
      { cells: ["", "", ""], emphasis: [1] },
      { cells: ["", "", ""], emphasis: [1] },
    ])

    expect(() => parseWeekDocument(cloned)).not.toThrow()
  })

  it("clones html layout page with cleared title and notes while preserving htmlFile", () => {
    const previous = parseWeekDocument({
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          id: "p03",
          layout: "html",
          title: "Previous Title",
          htmlFile: "p03.html",
          hidden: true,
          notes: "Previous notes",
        },
      ],
    })

    const cloned = cloneWeekFromPrevious(previous, "2026-08-31")
    expect(cloned.pages).toHaveLength(1)
    const page = cloned.pages[0]
    expect(page.id).toBe("p03")
    expect(page.layout).toBe("html")
    expect(page.title).toBe("")
    expect(page.hidden).toBe(true)
    expect(page.notes).toBeUndefined()
    if (page.layout !== "html") {
      throw new Error("expected html page")
    }
    expect(page.htmlFile).toBe("p03.html")
    // @ts-expect-error html page does not have items
    expect(page.items).toBeUndefined()
    // @ts-expect-error html page does not have panel
    expect(page.panel).toBeUndefined()

    expect(() => parseWeekDocument(cloned)).not.toThrow()
  })
})
