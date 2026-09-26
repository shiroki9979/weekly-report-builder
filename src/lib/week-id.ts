// 週次 id 即週一 ISO 日期；檔名、dev server 路由與前端共用同一個格式來源
export const MONDAY_ID_SOURCE = String.raw`\d{4}-\d{2}-\d{2}`

const MONDAY_ID_PATTERN = new RegExp(`^${MONDAY_ID_SOURCE}$`)

export function isMondayId(value: string): boolean {
  return MONDAY_ID_PATTERN.test(value)
}
