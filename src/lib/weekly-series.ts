// 週報流程：週次以週一日期當 Deck ID、期間固定週一到週五、新週以最新一週為範本。
// 通用的清空與建立規則在 deck-template，這裡只放週次專屬的日期規則
import type { DeckPeriod } from "./deck"
import {
  addCalendarDays,
  formatCalendarDate,
  isCalendarMonday,
  parseCalendarDate,
} from "./calendar-date"

const MONDAY_TO_FRIDAY_DAYS = 4
const DAYS_PER_WEEK = 7

function parseMonday(value: string): Date {
  if (!isCalendarMonday(value)) {
    throw new Error(`Invalid date: ${value}`)
  }

  return parseCalendarDate(value)
}

export function weekRangeForMonday(monday: string): DeckPeriod {
  const startDate = parseMonday(monday)
  const endDate = new Date(startDate)
  addCalendarDays(endDate, MONDAY_TO_FRIDAY_DAYS)

  return {
    start: formatCalendarDate(startDate),
    end: formatCalendarDate(endDate),
  }
}

// 週報序列只看週一日期 id；其他 Deck 不能當建新週的起點
export function latestWeekMonday(decks: string[]): string | null {
  return decks.filter(isCalendarMonday).at(-1) ?? null
}

// 有週次時開啟最新一週，維持改名前「打開就是本週週報」的行為；
// 非週報 Deck 的 id 依字串排序會排在日期之後，直接取最後一份會跳過週報。沒有週次時才退回最後一份 Deck
export function defaultDeckId(deckIds: string[]): string | undefined {
  return latestWeekMonday(deckIds) ?? deckIds.at(-1)
}

export function nextMondayAfter(monday: string): string {
  const date = parseMonday(monday)
  addCalendarDays(date, DAYS_PER_WEEK)
  return formatCalendarDate(date)
}

export type WeekFromPreviousPlan = {
  templateId: string
  period: DeckPeriod
}

// 建新週的週次規則只在這裡判斷；dev server 與測試替身拿到計畫後各自走通用的「從模板建立 Deck」，錯誤文案因此一致
export function planWeekFromPrevious(
  deckIds: string[],
  monday: string
): WeekFromPreviousPlan {
  const templateId = latestWeekMonday(deckIds)
  if (!templateId) {
    throw new Error("No previous week to clone")
  }

  // 非週一 id 若放行，會建出期間對不上 id 的「週次」
  if (!isCalendarMonday(monday)) {
    throw new Error(`Week file name must be a Monday date: ${monday}`)
  }

  return { templateId, period: weekRangeForMonday(monday) }
}
