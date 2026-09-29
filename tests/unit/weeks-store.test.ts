import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { parseWeekDocument } from "@/lib/week-document"
import { setPageHidden, setPageTitle } from "@/lib/week-editor"
import {
  createDeckFromTemplateFile,
  createWeekFromPrevious,
  listWeeksInDirectory,
  WeekAlreadyExistsError,
  readWeekFile,
  writeWeekFile,
} from "../../server/weeks-store"

const cloneFixturePath = join(
  import.meta.dirname,
  "../fixtures/clone-previous-week.json"
)

describe("weeks-store", () => {
  it("writes a week file that reloads with the same content and hide flag", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "weekly-report-builder-"))
    const sourceWeek = parseWeekDocument({
      period: { start: "2026-08-24", end: "2026-08-28" },
      pages: [
        {
          id: "p01",
          layout: "two-column",
          title: "Weekly Report",
          items: [
            { heading: "One", body: "First" },
            { heading: "Two", body: "Second" },
            { heading: "Three", body: "Third" },
          ],
          panel: {
            kind: "table",
            title: "Summary",
            columns: ["A", "B"],
            rows: [{ cells: ["x", "y"] }],
          },
        },
      ],
    })

    try {
      const edited = setPageHidden(
        setPageTitle(sourceWeek, 0, "Weekly Report · saved"),
        0,
        true
      )

      writeWeekFile(tempDir, "2026-08-24", edited)
      expect(listWeeksInDirectory(tempDir)).toEqual(["2026-08-24"])

      const reloaded = readWeekFile(tempDir, "2026-08-24")
      const raw = readFileSync(join(tempDir, "2026-08-24.json"), "utf-8")
      const parsedAgain = parseWeekDocument(JSON.parse(raw))

      expect(reloaded.pages[0].title).toBe("Weekly Report · saved")
      expect(reloaded.pages[0].hidden).toBe(true)
      expect(parsedAgain).toEqual(reloaded)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it("creates a new week file by cloning the latest week with cleared copy", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "weekly-report-builder-"))
    const previousRaw = readFileSync(cloneFixturePath, "utf-8")
    const previous = parseWeekDocument(JSON.parse(previousRaw))

    try {
      writeWeekFile(tempDir, "2026-08-24", previous)
      const created = createWeekFromPrevious(tempDir, "2026-08-31")

      expect(listWeeksInDirectory(tempDir)).toEqual([
        "2026-08-24",
        "2026-08-31",
      ])
      expect(created.period!.start).toBe("2026-08-31")
      expect(created.period!.end).toBe("2026-09-04")
      expect(created.pages).toHaveLength(previous.pages.length)
      expect(created.pages.every((page) => page.title === "")).toBe(true)
      expect(created.pages[1].hidden).toBe(true)

      const reloaded = readWeekFile(tempDir, "2026-08-31")
      expect(reloaded).toEqual(created)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it("rejects creating a week that already exists with a WeekAlreadyExistsError", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "weekly-report-builder-"))
    const previous = parseWeekDocument(
      JSON.parse(readFileSync(cloneFixturePath, "utf-8"))
    )

    try {
      writeWeekFile(tempDir, "2026-08-24", previous)

      expect(() => createWeekFromPrevious(tempDir, "2026-08-24")).toThrow(
        WeekAlreadyExistsError
      )
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it("copies referenced html files into the new week directory during cloning", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "weekly-report-builder-"))
    const sourceWeek = parseWeekDocument({
      period: { start: "2026-08-24", end: "2026-08-28" },
      pages: [
        {
          id: "p03",
          layout: "html",
          title: "HTML escape hatch",
          htmlFile: "p03.html",
          notes: "Speaker talking points",
        },
      ],
    })

    try {
      writeWeekFile(tempDir, "2026-08-24", sourceWeek)
      const sourceHtmlDir = join(tempDir, "2026-08-24")
      mkdirSync(sourceHtmlDir, { recursive: true })
      const htmlContent = '<div class="custom-chart">Content</div>'
      writeFileSync(join(sourceHtmlDir, "p03.html"), htmlContent, "utf-8")

      const created = createWeekFromPrevious(tempDir, "2026-08-31")
      expect(created.pages).toHaveLength(1)
      const clonedPage = created.pages[0]
      expect(clonedPage.layout).toBe("html")
      expect(clonedPage.title).toBe("")
      expect(clonedPage.notes).toBeUndefined()
      if (clonedPage.layout !== "html") {
        throw new Error("expected html page")
      }
      expect(clonedPage.htmlFile).toBe("p03.html")

      const targetHtmlFile = join(tempDir, "2026-08-31", "p03.html")
      expect(readFileSync(targetHtmlFile, "utf-8")).toBe(htmlContent)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it("throws an error when a referenced html file does not exist during cloning", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "weekly-report-builder-"))
    const sourceWeek = parseWeekDocument({
      period: { start: "2026-08-24", end: "2026-08-28" },
      pages: [
        {
          id: "p03",
          layout: "html",
          title: "HTML escape hatch",
          htmlFile: "missing.html",
        },
      ],
    })

    try {
      writeWeekFile(tempDir, "2026-08-24", sourceWeek)

      // 驗證當來源週次宣告的 htmlFile 實體檔案不存在時，clone 流程應立即拋出明確錯誤中斷，避免產生無效週次
      expect(() => createWeekFromPrevious(tempDir, "2026-08-31")).toThrow(
        /Referenced HTML file does not exist:/
      )
      expect(existsSync(join(tempDir, "2026-08-31.json"))).toBe(false)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it("does not publish a week file when a referenced HTML path is not a file", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "weekly-report-builder-"))
    const sourceWeek = parseWeekDocument({
      period: { start: "2026-08-24", end: "2026-08-28" },
      pages: [
        {
          id: "p03",
          layout: "html",
          title: "HTML escape hatch",
          htmlFile: "p03.html",
        },
      ],
    })

    try {
      writeWeekFile(tempDir, "2026-08-24", sourceWeek)
      mkdirSync(join(tempDir, "2026-08-24", "p03.html"), {
        recursive: true,
      })

      expect(() => createWeekFromPrevious(tempDir, "2026-08-31")).toThrow()
      expect(existsSync(join(tempDir, "2026-08-31.json"))).toBe(false)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it("stores a deck under a non-date id and rejects ids that could escape the store", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "weekly-report-builder-"))
    const deck = parseWeekDocument(
      JSON.parse(readFileSync(cloneFixturePath, "utf-8"))
    )

    try {
      writeWeekFile(tempDir, "2026-08-24", deck)
      writeWeekFile(tempDir, "q4-roadmap", deck)

      expect(listWeeksInDirectory(tempDir)).toEqual([
        "2026-08-24",
        "q4-roadmap",
      ])
      expect(readWeekFile(tempDir, "q4-roadmap")).toEqual(deck)
      for (const id of ["../escape", "Q4", "a/b", "a.b", "-lead", ""]) {
        expect(() => writeWeekFile(tempDir, id, deck)).toThrow(/Invalid/)
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it("clones a new week from the latest week, not from a later non-week deck", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "weekly-report-builder-"))
    const previous = parseWeekDocument(
      JSON.parse(readFileSync(cloneFixturePath, "utf-8"))
    )
    const other = setPageTitle(previous, 0, "Roadmap only")

    try {
      writeWeekFile(tempDir, "2026-08-24", previous)
      writeWeekFile(tempDir, "zz-roadmap", {
        ...other,
        pages: other.pages.slice(0, 1),
      })

      const created = createWeekFromPrevious(tempDir, "2026-08-31")

      expect(created.pages).toHaveLength(previous.pages.length)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it("refuses to clone when the store holds no week to start from", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "weekly-report-builder-"))
    const deck = parseWeekDocument(
      JSON.parse(readFileSync(cloneFixturePath, "utf-8"))
    )

    try {
      writeWeekFile(tempDir, "q4-roadmap", deck)

      expect(() => createWeekFromPrevious(tempDir, "2026-08-31")).toThrow(
        /No previous week/
      )
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it("creates a non-week deck from a template, copying its HTML files", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "weekly-report-builder-"))
    const template = parseWeekDocument({
      pages: [
        { id: "p01", layout: "html", title: "Map", htmlFile: "map.html" },
      ],
    })

    try {
      writeWeekFile(tempDir, "q3-roadmap", template)
      mkdirSync(join(tempDir, "q3-roadmap"))
      writeFileSync(join(tempDir, "q3-roadmap", "map.html"), "<p>map</p>")

      const created = createDeckFromTemplateFile(
        tempDir,
        "q3-roadmap",
        "q4-roadmap"
      )

      expect(created).not.toHaveProperty("period")
      expect(created.pages[0].title).toBe("")
      expect(readWeekFile(tempDir, "q4-roadmap")).toEqual(created)
      expect(
        readFileSync(join(tempDir, "q4-roadmap", "map.html"), "utf-8")
      ).toBe("<p>map</p>")
      expect(() =>
        createDeckFromTemplateFile(tempDir, "q3-roadmap", "q4-roadmap")
      ).toThrow(WeekAlreadyExistsError)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it("rejects a week that is not a Monday before creating anything", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "weekly-report-builder-"))
    const previous = parseWeekDocument(
      JSON.parse(readFileSync(cloneFixturePath, "utf-8"))
    )

    try {
      writeWeekFile(tempDir, "2026-08-24", previous)

      expect(() => createWeekFromPrevious(tempDir, "2026-09-01")).toThrow(
        "Week file name must be a Monday date: 2026-09-01"
      )
      expect(existsSync(join(tempDir, "2026-09-01.json"))).toBe(false)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
