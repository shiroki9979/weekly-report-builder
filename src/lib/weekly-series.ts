// 週報流程：週次以週一日期當 Deck ID、期間固定週一到週五、新週以最新一週為範本。
// 通用的清空與建立規則在 deck-template，這裡只放週次專屬的日期規則
import { createDeckFromTemplate } from "./deck-template"
import type { DeckPeriod, WeekDocument } from "./week-document"
import { isCalendarMonday } from "./calendar-date"

function parseMonday(value: string): Date {
  if (!isCalendarMonday(value)) {
    throw new Error(`Invalid date: ${value}`)
  }

  return new Date(`${value}T00:00:00Z`)
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function weekRangeForMonday(monday: string): DeckPeriod {
  const startDate = parseMonday(monday)
  const endDate = new Date(startDate)
  endDate.setUTCDate(endDate.getUTCDate() + 4)

  return {
    start: formatDate(startDate),
    end: formatDate(endDate),
  }
}

// 週報序列只看週一日期 id；其他 Deck 不能當建新週的起點
export function latestWeekMonday(weeks: string[]): string | null {
  return weeks.filter(isCalendarMonday).at(-1) ?? null
}

export function nextMondayAfter(monday: string): string {
  const date = parseMonday(monday)
  date.setUTCDate(date.getUTCDate() + 7)
  return formatDate(date)
}

export function cloneWeekFromPrevious(
  previous: WeekDocument,
  targetMonday: string
): WeekDocument {
  if (!isCalendarMonday(targetMonday)) {
    throw new Error(`Week file name must be a Monday date: ${targetMonday}`)
  }

  return createDeckFromTemplate(previous, {
    period: weekRangeForMonday(targetMonday),
  })
}
