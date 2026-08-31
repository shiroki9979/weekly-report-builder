import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { parseWeekDocument } from "@/lib/week-document"
import { setPageHidden, setPageTitle } from "@/lib/week-editor"
import {
  createWeekFromPrevious,
  listWeeksInDirectory,
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
      start: "2026-08-24",
      end: "2026-08-28",
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
      expect(created.start).toBe("2026-08-31")
      expect(created.end).toBe("2026-09-04")
      expect(created.pages).toHaveLength(previous.pages.length)
      expect(created.pages.every((page) => page.title === "")).toBe(true)
      expect(created.pages[1].hidden).toBe(true)

      const reloaded = readWeekFile(tempDir, "2026-08-31")
      expect(reloaded).toEqual(created)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
