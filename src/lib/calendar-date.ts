// ISO 日期（YYYY-MM-DD）的共用檢查：週報流程要週一，Trend & Target 依 cadence 要週一或每月 1 日
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// 只檢查字面格式；超出四位數年份時 toISOString 會改用 ±YYYYYY，藉此判斷日期運算是否越界
export function isIsoDateText(value: string): boolean {
  return ISO_DATE_PATTERN.test(value)
}

function calendarDate(value: string): Date | null {
  if (!isIsoDateText(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  // 2026-02-30 會被 Date 進位成 3 月，往返比對才能擋下不存在的日期
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? date
    : null
}

export function isCalendarDate(value: string): boolean {
  return calendarDate(value) !== null
}

export function isCalendarMonday(value: string): boolean {
  return calendarDate(value)?.getUTCDay() === 1
}

export function isFirstOfMonth(value: string): boolean {
  return calendarDate(value)?.getUTCDate() === 1
}
