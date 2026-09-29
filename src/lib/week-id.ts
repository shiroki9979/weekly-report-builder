// 週一 ISO 日期格式；只用於週報流程與 Trend & Target 的日期，儲存層 id 改由 deck-id 檢查
export const MONDAY_ID_SOURCE = String.raw`\d{4}-\d{2}-\d{2}`

const MONDAY_ID_PATTERN = new RegExp(`^${MONDAY_ID_SOURCE}$`)

export function isMondayId(value: string): boolean {
  return MONDAY_ID_PATTERN.test(value)
}

export function isCalendarMonday(value: string): boolean {
  if (!isMondayId(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    date.getUTCDay() === 1
  )
}
