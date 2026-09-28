// browser adapter 的 HTML 輪詢與 paint 等待都發生在 gate 的準備階段內；
// 準備上限由兩者推導，HTML 逾時才會先回報為 html-load-failed，而非整個操作失敗。
export const HTML_LOAD_TIMEOUT_MS = 3000
export const PAINT_SETTLE_TIMEOUT_MS = 1000
// mount 與輪詢間隔本身也耗時，留出餘裕避免準備上限搶在 HTML 逾時之前觸發
const PREPARATION_MARGIN_MS = 1000

export const PREPARATION_TIMEOUT_MS =
  HTML_LOAD_TIMEOUT_MS + PAINT_SETTLE_TIMEOUT_MS + PREPARATION_MARGIN_MS
