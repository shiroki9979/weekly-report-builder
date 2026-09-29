// Deck ID 是儲存層唯一的路徑安全檢查：只允許小寫英數與連字號，不含 `.`、`/`，無法穿越目錄；
// 檔名、dev server 路由與前端共用這個來源。週一日期只是其中一種合法 id，週次規則由週報流程自己檢查
export const DECK_ID_SOURCE = String.raw`[a-z0-9][a-z0-9-]{0,63}`

const DECK_ID_PATTERN = new RegExp(`^${DECK_ID_SOURCE}$`)

export function isDeckId(value: string): boolean {
  return DECK_ID_PATTERN.test(value)
}
