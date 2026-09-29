import fs from "node:fs"
import path from "node:path"

import { createDeckFromTemplate } from "../src/lib/deck-template"
import {
  isHtmlWeekPage,
  parseWeekDocument,
  type DeckPeriod,
  type WeekDocument,
} from "../src/lib/week-document"
import { isDeckId } from "../src/lib/deck-id"
import { isCalendarMonday } from "../src/lib/week-id"
import { latestWeekMonday, weekRangeForMonday } from "../src/lib/weekly-series"
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

/**
 * 以既有 Deck 為範本建立新 Deck：清空作者文字並複製 HTML Page 引用的檔案。
 * 範本的 HTML 檔缺漏時在寫入任何東西前中止，避免留下半套 Deck。
 */
export function createDeckFromTemplateFile(
  weeksDir: string,
  templateId: string,
  deckId: string,
  options: { period?: DeckPeriod } = {}
): WeekDocument {
  const filePath = resolveWeekFilePath(weeksDir, deckId)
  if (fs.existsSync(filePath)) {
    throw new WeekAlreadyExistsError(deckId)
  }

  const template = readWeekFile(weeksDir, templateId)
  const created = createDeckFromTemplate(template, options)

  const htmlFiles = template.pages.flatMap((page) => {
    if (!isHtmlWeekPage(page)) {
      return []
    }

    const sourceFile = path.resolve(weeksDir, templateId, page.htmlFile)
    if (!fs.existsSync(sourceFile) || !fs.statSync(sourceFile).isFile()) {
      throw new Error(`Referenced HTML file does not exist: ${sourceFile}`)
    }

    return [{ sourceFile, htmlFile: page.htmlFile }]
  })
  const targetDir = path.resolve(weeksDir, deckId)

  for (const { sourceFile, htmlFile } of htmlFiles) {
    fs.mkdirSync(targetDir, { recursive: true })
    fs.copyFileSync(sourceFile, path.resolve(targetDir, htmlFile))
  }

  writeWeekFile(weeksDir, deckId, created)

  return created
}

// 週報流程：以最新一週為範本、期間為目標週的週一到週五
export function createWeekFromPrevious(
  weeksDir: string,
  monday: string
): WeekDocument {
  resolveWeekFilePath(weeksDir, monday)
  const latestMonday = latestWeekMonday(listWeeksInDirectory(weeksDir))

  if (!latestMonday) {
    throw new Error("No previous week to clone")
  }

  // 先驗證目標週一，再交給通用建立流程，避免非週一 id 建出沒有期間的「週次」
  if (!isCalendarMonday(monday)) {
    throw new Error(`Week file name must be a Monday date: ${monday}`)
  }

  return createDeckFromTemplateFile(weeksDir, latestMonday, monday, {
    period: weekRangeForMonday(monday),
  })
}
