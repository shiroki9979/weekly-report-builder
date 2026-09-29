import fs from "node:fs"
import path from "node:path"

import { createDeckFromTemplate } from "../src/lib/deck-template"
import {
  isHtmlPage,
  parseDeck,
  type DeckPeriod,
  type Deck,
} from "../src/lib/deck"
import { isDeckId } from "../src/lib/deck-id"
import { isCalendarMonday } from "../src/lib/calendar-date"
import { latestWeekMonday, weekRangeForMonday } from "../src/lib/weekly-series"
import { listDeckIds, serializeDeck } from "../src/lib/decks-io"

// dev server 依型別而非訊息字串對應 409，避免改文案就改變 HTTP 語意
export class DeckAlreadyExistsError extends Error {
  constructor(deckId: string) {
    super(`Deck already exists: ${deckId}`)
    this.name = "DeckAlreadyExistsError"
  }
}

function resolveDeckFilePath(decksDir: string, deckId: string): string {
  if (!isDeckId(deckId)) {
    throw new Error(`Invalid deck id: ${deckId}`)
  }

  const filePath = path.resolve(decksDir, `${deckId}.json`)
  if (!filePath.startsWith(decksDir)) {
    throw new Error(`Invalid deck path: ${deckId}`)
  }

  return filePath
}

export function listDecksInDirectory(decksDir: string): string[] {
  if (!fs.existsSync(decksDir)) {
    return []
  }

  return listDeckIds(fs.readdirSync(decksDir))
}

export function readDeckFile(decksDir: string, deckId: string): Deck {
  const filePath = resolveDeckFilePath(decksDir, deckId)
  const raw = fs.readFileSync(filePath, "utf-8")
  return parseDeck(JSON.parse(raw))
}

export function writeDeckFile(
  decksDir: string,
  deckId: string,
  deck: Deck
): void {
  const filePath = resolveDeckFilePath(decksDir, deckId)
  const validated = parseDeck(deck)
  fs.mkdirSync(decksDir, { recursive: true })
  fs.writeFileSync(filePath, serializeDeck(validated), "utf-8")
}

/**
 * 以既有 Deck 為範本建立新 Deck：清空作者文字並複製 HTML Page 引用的檔案。
 * 範本的 HTML 檔缺漏時在寫入任何東西前中止，避免留下半套 Deck。
 */
export function createDeckFromTemplateFile(
  decksDir: string,
  templateId: string,
  deckId: string,
  options: { period?: DeckPeriod } = {}
): Deck {
  const filePath = resolveDeckFilePath(decksDir, deckId)
  if (fs.existsSync(filePath)) {
    throw new DeckAlreadyExistsError(deckId)
  }

  const template = readDeckFile(decksDir, templateId)
  const created = createDeckFromTemplate(template, options)

  const htmlFiles = template.pages.flatMap((page) => {
    if (!isHtmlPage(page)) {
      return []
    }

    const sourceFile = path.resolve(decksDir, templateId, page.htmlFile)
    if (!fs.existsSync(sourceFile) || !fs.statSync(sourceFile).isFile()) {
      throw new Error(`Referenced HTML file does not exist: ${sourceFile}`)
    }

    return [{ sourceFile, htmlFile: page.htmlFile }]
  })
  const targetDir = path.resolve(decksDir, deckId)

  for (const { sourceFile, htmlFile } of htmlFiles) {
    fs.mkdirSync(targetDir, { recursive: true })
    fs.copyFileSync(sourceFile, path.resolve(targetDir, htmlFile))
  }

  writeDeckFile(decksDir, deckId, created)

  return created
}

// 週報流程：以最新一週為範本、期間為目標週的週一到週五
export function createWeekFromPrevious(decksDir: string, monday: string): Deck {
  resolveDeckFilePath(decksDir, monday)
  const latestMonday = latestWeekMonday(listDecksInDirectory(decksDir))

  if (!latestMonday) {
    throw new Error("No previous week to clone")
  }

  // 先驗證目標週一，再交給通用建立流程，避免非週一 id 建出沒有期間的「週次」
  if (!isCalendarMonday(monday)) {
    throw new Error(`Week file name must be a Monday date: ${monday}`)
  }

  return createDeckFromTemplateFile(decksDir, latestMonday, monday, {
    period: weekRangeForMonday(monday),
  })
}
