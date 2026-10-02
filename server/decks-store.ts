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
import { planWeekFromPrevious } from "../src/lib/weekly-series"
import { listDeckIds, serializeDeck } from "../src/lib/decks-io"
import { isPathInside } from "./path-containment"

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
  if (!isPathInside(decksDir, filePath)) {
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

export type DeckFromTemplateRequest = {
  templateId: string
  deckId: string
  period?: DeckPeriod
}

/**
 * 以既有 Deck 為範本建立新 Deck：清空作者文字並複製 HTML Page 引用的檔案。
 * 範本的 HTML 檔缺漏時在寫入任何東西前中止，避免留下半套 Deck。
 */
export function createDeckFromTemplateFile(
  decksDir: string,
  { templateId, deckId, period }: DeckFromTemplateRequest
): Deck {
  assertDeckAbsent(decksDir, deckId)
  const template = readDeckFile(decksDir, templateId)
  const htmlFiles = collectTemplateHtmlFiles(decksDir, templateId, template)
  const created = createDeckFromTemplate(template, { period })

  copyHtmlFiles(htmlFiles, path.resolve(decksDir, deckId))
  writeDeckFile(decksDir, deckId, created)

  return created
}

// 週報流程：週次規則交給 weekly-series，這裡只負責檔案
export function createWeekFromPrevious(decksDir: string, monday: string): Deck {
  // 先回報撞名再檢查週次規則，與改名前的 409 行為一致
  assertDeckAbsent(decksDir, monday)
  const { templateId, period } = planWeekFromPrevious(
    listDecksInDirectory(decksDir),
    monday
  )

  return createDeckFromTemplateFile(decksDir, {
    templateId,
    deckId: monday,
    period,
  })
}

function assertDeckAbsent(decksDir: string, deckId: string): void {
  if (fs.existsSync(resolveDeckFilePath(decksDir, deckId))) {
    throw new DeckAlreadyExistsError(deckId)
  }
}

type HtmlFileCopy = { sourceFile: string; htmlFile: string }

function collectTemplateHtmlFiles(
  decksDir: string,
  templateId: string,
  template: Deck
): HtmlFileCopy[] {
  return template.pages.filter(isHtmlPage).map(({ htmlFile }) => {
    const sourceFile = path.resolve(decksDir, templateId, htmlFile)
    if (!fs.existsSync(sourceFile) || !fs.statSync(sourceFile).isFile()) {
      throw new Error(`Referenced HTML file does not exist: ${sourceFile}`)
    }

    return { sourceFile, htmlFile }
  })
}

function copyHtmlFiles(htmlFiles: HtmlFileCopy[], targetDir: string): void {
  for (const { sourceFile, htmlFile } of htmlFiles) {
    fs.mkdirSync(targetDir, { recursive: true })
    fs.copyFileSync(sourceFile, path.resolve(targetDir, htmlFile))
  }
}
