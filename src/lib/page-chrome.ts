import type {
  EditorialFrameLayout,
  EditorialFramePage,
  EditorialPageChrome,
  PageChrome,
} from "./deck.ts"
import type { ExportIssue } from "./export-readiness.ts"
import { absentWhenBlank, isBlank } from "./optional-text.ts"

// 只依賴型別：deck.ts 的 parser 會呼叫這裡，執行期再 import deck.ts 就成了循環；
// Editorial Frame 成員由呼叫端判斷，傳入已縮小型別的頁面

type ChromeCarrier = PageChrome & { id: string; layout: string; title: string }

type PageChromeFields = PageChrome & { title: string }
type EditorialFrameChromeFields = PageChromeFields & EditorialPageChrome

// 每個 chrome 欄位都得出現（值可為 undefined）：新增 chrome 欄位時漏寫它的 Deck Template 政策即編譯失敗
type EveryField<T> = { [F in keyof Required<T>]: T[F] }

// 頁碼覆寫的政策屬於 stage-page-context（候選 4），由呼叫端算好傳入，這裡不 import 它以免繞回 deck.ts
export type DelegatedTemplateChrome = { showPageNumber: boolean | undefined }

// 每個 chrome 欄位固定一個存檔位置，缺席時仍保留 key（值為 undefined，JSON.stringify 會略過）；
// setter 以 spread 覆寫時位置不變，存檔、重新載入、再存檔才不會換位置
export function inPageChromeOrder<P extends ChromeCarrier>(page: P): P {
  const { id, layout, title, hidden, notes, showPageNumber, ...content } = page
  return { id, layout, title, ...content, hidden, notes, showPageNumber } as P
}

// Eyebrow 緊接在 headline 之後、Boundary Note 收在最後，對應 Stage 由上而下的順序
export function inEditorialFrameChromeOrder<
  P extends ChromeCarrier & EditorialPageChrome,
>(page: P): P {
  const {
    id,
    layout,
    title,
    eyebrow,
    hidden,
    notes,
    showPageNumber,
    boundary,
    ...content
  } = page
  return {
    id,
    layout,
    title,
    eyebrow,
    ...content,
    hidden,
    notes,
    showPageNumber,
    boundary,
  } as P
}

// Deck Template 對每一頁 chrome 的處理，HTML Page 與 unknown 頁也適用
export function pageTemplateChrome(
  page: PageChromeFields,
  delegated: DelegatedTemplateChrome
): EveryField<PageChromeFields> {
  return {
    // Headline 是當週的結論（HTML Page 則是當週的頁面標籤），換一週就要重寫
    title: "",
    // 講稿屬於當週內容
    notes: undefined,
    // 隱藏屬於 Deck 結構：範本裡藏起來的頁，在新 Deck 仍隱藏
    hidden: page.hidden,
    showPageNumber: delegated.showPageNumber,
  }
}

export function editorialFrameTemplateChrome(
  page: EditorialFrameChromeFields,
  delegated: DelegatedTemplateChrome
): EveryField<EditorialFrameChromeFields> {
  return {
    ...pageTemplateChrome(page, delegated),
    // Eyebrow 寫的是這一頁的溝通任務，沿用頁面結構時一併保留
    eyebrow: page.eyebrow,
    // Boundary Note 描述的是當週主張的成立範圍，換一週就不再成立
    boundary: undefined,
  }
}

// Headline 是每個 Structured Layout 頁面唯一必填的 chrome；排在問題清單第一位，對應它在頁面最上方。
// HTML Page 的 title 只是工坊標籤，呼叫端不會拿 HTML Page 來問
export function headlineIssues(page: { title: string }): ExportIssue[] {
  return isBlank(page.title)
    ? [{ code: "missing-content", path: "title", message: "Title is required" }]
    : []
}

// 唯一的預設詞來源，Stage 與工坊共用才不會顯示不同的詞；
// 以 Record 鍵住每個 Editorial Frame 版型，新增版型漏登記時型別檢查即失敗。
// Two-column 是通用版型，沒有固定的溝通任務，留空讓作者自行寫出（#74）。
const DEFAULT_EYEBROWS: Record<EditorialFrameLayout, string> = {
  overview: "Overview",
  "evidence-decision": "Evidence-backed Decision",
  "next-actions": "Next Actions",
  "trend-target": "Trend & Target",
  "side-by-side": "Comparison",
  "full-width-panel": "Panel",
  closing: "Closing",
  "two-column": "",
}

export function defaultEyebrow(layout: EditorialFrameLayout): string {
  return DEFAULT_EYEBROWS[layout]
}

// 作者沒寫（或只寫了空白）時退回版型預設詞
export function resolveEyebrow(page: EditorialFramePage): string {
  return absentWhenBlank(page.eyebrow)?.trim() ?? defaultEyebrow(page.layout)
}
