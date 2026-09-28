import type { WeekDocument } from "./week-document"
import { MONDAY_ID_SOURCE } from "./week-id"

const WEEK_FILE_NAME = new RegExp(`^(${MONDAY_ID_SOURCE})\\.json$`)

export function serializeWeekDocument(week: WeekDocument): string {
  return `${JSON.stringify(week, null, 2)}\n`
}

export function mondayFromWeekFile(fileName: string): string | null {
  const match = WEEK_FILE_NAME.exec(fileName)
  return match?.[1] ?? null
}

export function listWeekMondays(fileNames: string[]): string[] {
  return fileNames
    .map(mondayFromWeekFile)
    .filter((monday): monday is string => monday !== null)
    .sort()
}
