import type { WeekDocument } from "./week-document"

export function serializeWeekDocument(week: WeekDocument): string {
  return `${JSON.stringify(week, null, 2)}\n`
}

export function mondayFromWeekFile(fileName: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})\.json$/.exec(fileName)
  return match?.[1] ?? null
}

export function listWeekMondays(fileNames: string[]): string[] {
  return fileNames
    .map(mondayFromWeekFile)
    .filter((monday): monday is string => monday !== null)
    .sort()
}
