import type { Panel, Deck, Page } from "@/lib/deck"

// 各 page 編輯表單共用的輸入組合；新增共用欄位只改這裡
export type PageEditorProps<P extends Page = Page> = {
  deck: Deck
  pageIndex: number
  page: P
  onChange: (update: (deck: Deck) => Deck) => void
  readOnly?: boolean
}

// Two-column panel 子表單只改 panel，但寫回仍要整份 Deck 與頁面位置。
// 唯讀由外層 fieldset 的 disabled 處理，不另收 readOnly，避免型別宣稱支援卻被忽略
export type PanelEditorProps<P extends Panel> = Omit<
  PageEditorProps,
  "page" | "readOnly"
> & {
  panel: P
}
