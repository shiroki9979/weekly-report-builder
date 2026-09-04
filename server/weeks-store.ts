import fs from "node:fs"
import path from "node:path"

import { cloneWeekFromPrevious } from "../src/lib/week-clone"
import {
  isHtmlWeekPage,
  parseWeekDocument,
  type WeekDocument,
} from "../src/lib/week-document"
import { listWeekMondays, serializeWeekDocument } from "../src/lib/weeks-io"

const MONDAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function listWeeksInDirectory(weeksDir: string): string[] {
  if (!fs.existsSync(weeksDir)) {
    return []
  }

  return listWeekMondays(fs.readdirSync(weeksDir))
}

export function readWeekFile(weeksDir: string, monday: string): WeekDocument {
  if (!MONDAY_PATTERN.test(monday)) {
    throw new Error(`Invalid week id: ${monday}`)
  }

  const filePath = path.resolve(weeksDir, `${monday}.json`)
  if (!filePath.startsWith(weeksDir)) {
    throw new Error(`Invalid week path: ${monday}`)
  }

  const raw = fs.readFileSync(filePath, "utf-8")
  return parseWeekDocument(JSON.parse(raw))
}

export function writeWeekFile(
  weeksDir: string,
  monday: string,
  week: WeekDocument
): void {
  if (!MONDAY_PATTERN.test(monday)) {
    throw new Error(`Invalid week id: ${monday}`)
  }

  const filePath = path.resolve(weeksDir, `${monday}.json`)
  if (!filePath.startsWith(weeksDir)) {
    throw new Error(`Invalid week path: ${monday}`)
  }

  const validated = parseWeekDocument(week)
  fs.mkdirSync(weeksDir, { recursive: true })
  fs.writeFileSync(filePath, serializeWeekDocument(validated), "utf-8")
}

export function createWeekFromPrevious(
  weeksDir: string,
  monday: string
): WeekDocument {
  if (!MONDAY_PATTERN.test(monday)) {
    throw new Error(`Invalid week id: ${monday}`)
  }

  const weeks = listWeeksInDirectory(weeksDir)
  const latestMonday = weeks.at(-1)

  if (!latestMonday) {
    throw new Error("No previous week to clone")
  }

  const filePath = path.resolve(weeksDir, `${monday}.json`)
  if (fs.existsSync(filePath)) {
    throw new Error(`Week already exists: ${monday}`)
  }

  const previous = readWeekFile(weeksDir, latestMonday)
  const cloned = cloneWeekFromPrevious(previous, monday)

  const htmlFiles = previous.pages.flatMap((page) => {
    if (!isHtmlWeekPage(page)) {
      return []
    }

    const sourceFile = path.resolve(weeksDir, latestMonday, page.htmlFile)
    if (!fs.existsSync(sourceFile) || !fs.statSync(sourceFile).isFile()) {
      throw new Error(`Referenced HTML file does not exist: ${sourceFile}`)
    }

    return [{ sourceFile, htmlFile: page.htmlFile }]
  })
  const targetDir = path.resolve(weeksDir, monday)

  for (const { sourceFile, htmlFile } of htmlFiles) {
    fs.mkdirSync(targetDir, { recursive: true })
    fs.copyFileSync(sourceFile, path.resolve(targetDir, htmlFile))
  }

  writeWeekFile(weeksDir, monday, cloned)

  return cloned
}
