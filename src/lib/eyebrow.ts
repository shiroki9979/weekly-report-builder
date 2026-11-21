import type { EditorialFramePage } from "./deck.ts"

export type EditorialFrameLayout = EditorialFramePage["layout"]

// 唯一的預設詞來源，Stage 與工坊共用才不會顯示不同的詞；
// 以 Record 鍵住每個 Editorial Frame 版型，新增版型漏登記時型別檢查即失敗。
// Two-column 是通用版型，沒有固定的溝通任務，留空讓作者自行寫出（#74）。
export const DEFAULT_EYEBROWS: Record<EditorialFrameLayout, string> = {
  overview: "Overview",
  "evidence-decision": "Evidence-backed Decision",
  "next-actions": "Next Actions",
  "trend-target": "Trend & Target",
  "side-by-side": "Comparison",
  "full-width-panel": "Panel",
  closing: "Closing",
  "two-column": "",
}

// 只含空白的作者值視同未填，免得誤輸入的空白蓋掉預設詞
export function resolveEyebrow(page: EditorialFramePage): string {
  return page.eyebrow?.trim() || DEFAULT_EYEBROWS[page.layout]
}
