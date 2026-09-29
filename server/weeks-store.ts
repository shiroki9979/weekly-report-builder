import fs from "node:fs"
import path from "node:path"

import { cloneWeekFromPrevious } from "../src/lib/week-clone"
import {
  isHtmlWeekPage,
  parseWeekDocument,
  type WeekDocument,
} from "../src/lib/week-document"
import { isDeckId } from "../src/lib/deck-id"
import { isCalendarMonday } from "../src/lib/week-id"
import { listWeekMondays, serializeWeekDocument } from "../src/lib/weeks-io"

// dev server 依型別而非訊息字串對應 409，避免改文案就改變 HTTP 語意
export class WeekAlreadyExistsError extends Error {
  constructor(monday: string) {
    super(`Week already exists: ${monday}`)
    this.name = "WeekAlreadyExistsError"
  }
}

function resolveWeekFilePath(weeksDir: string, monday: string): string {
  if (!isDeckId(monday)) {
    throw new Error(`Invalid week id: ${monday}`)
  }

  const filePath = path.resolve(weeksDir, `${monday}.json`)
  if (!filePath.startsWith(weeksDir)) {
    throw new Error(`Invalid week path: ${monday}`)
  }

  return filePath
}

export function listWeeksInDirectory(weeksDir: string): string[] {
  if (!fs.existsSync(weeksDir)) {
    return []
  }

  return listWeekMondays(fs.readdirSync(weeksDir))
}

export function readWeekFile(weeksDir: string, monday: string): WeekDocument {
  const filePath = resolveWeekFilePath(weeksDir, monday)
  const raw = fs.readFileSync(filePath, "utf-8")
  return parseWeekDocument(JSON.parse(raw))
}

export function writeWeekFile(
  weeksDir: string,
  monday: string,
  week: WeekDocument
): void {
  const filePath = resolveWeekFilePath(weeksDir, monday)
  const validated = parseWeekDocument(week)
  fs.mkdirSync(weeksDir, { recursive: true })
  fs.writeFileSync(filePath, serializeWeekDocument(validated), "utf-8")
}

export function createWeekFromPrevious(
  weeksDir: string,
  monday: string
): WeekDocument {
  const filePath = resolveWeekFilePath(weeksDir, monday)
  // 只以週次文件當範本；其他 Deck 不屬於週報序列
  const weeks = listWeeksInDirectory(weeksDir).filter(isCalendarMonday)
  const latestMonday = weeks.at(-1)

  if (!latestMonday) {
    throw new Error("No previous week to clone")
  }

  if (fs.existsSync(filePath)) {
    throw new WeekAlreadyExistsError(monday)
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
