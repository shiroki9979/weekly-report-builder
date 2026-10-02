// ISO 日期（YYYY-MM-DD）的共用檢查與轉換：週報流程要週一，Trend & Target 依 cadence 要週一或每月 1 日
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const ISO_DATE_LENGTH = "YYYY-MM-DD".length
const MONDAY = 1
export const DAYS_PER_WEEK = 7

// 只檢查字面格式；超出四位數年份時 toISOString 會改用 ±YYYYYY，藉此判斷日期運算是否越界
export function isIsoDateText(value: string): boolean {
  return ISO_DATE_PATTERN.test(value)
}

// 日期一律以 UTC 午夜表示，本地時區才不會讓日期前後跳一天
export function formatCalendarDate(date: Date): string {
  return date.toISOString().slice(0, ISO_DATE_LENGTH)
}

function calendarDate(value: string): Date | null {
  if (!isIsoDateText(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  // 2026-02-30 會被 Date 進位成 3 月，往返比對才能擋下不存在的日期
  return !Number.isNaN(date.getTime()) && formatCalendarDate(date) === value
    ? date
    : null
}

export function parseCalendarDate(value: string): Date {
  const date = calendarDate(value)
  if (!date) throw new Error(`Invalid date: ${value}`)
  return date
}

export function isCalendarDate(value: string): boolean {
  return calendarDate(value) !== null
}

export function isCalendarMonday(value: string): boolean {
  return calendarDate(value)?.getUTCDay() === MONDAY
}

export function isFirstOfMonth(value: string): boolean {
  return calendarDate(value)?.getUTCDate() === 1
}

export function addCalendarDays(date: Date, days: number): void {
  date.setUTCDate(date.getUTCDate() + days)
}

// 當天就是週一時回傳 0，因此結果落在 0 到 6
export function daysUntilMonday(date: Date): number {
  return (MONDAY - date.getUTCDay() + DAYS_PER_WEEK) % DAYS_PER_WEEK
}
