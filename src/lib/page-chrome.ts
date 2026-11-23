import type { EditorialPageChrome, PageChrome } from "./deck.ts"

// 只依賴型別：deck.ts 的 parser 會呼叫這裡，執行期再 import deck.ts 就成了循環；
// Editorial Frame 成員由呼叫端判斷，傳入已縮小型別的頁面

type ChromeCarrier = PageChrome & { id: string; layout: string; title: string }

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
