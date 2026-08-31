import fs from "node:fs"
import path from "node:path"

import { parseWeekDocument, type WeekDocument } from "../src/lib/week-document"
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
