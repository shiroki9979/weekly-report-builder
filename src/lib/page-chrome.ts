import type { EditorialPageChrome, PageChrome } from "./deck.ts"

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
