import type { Panel, WeekDocument, WeekPage } from "@/lib/week-document"

// 各 page 編輯表單共用的輸入組合；新增共用欄位只改這裡
export type PageEditorProps<P extends WeekPage = WeekPage> = {
  week: WeekDocument
  pageIndex: number
  page: P
  onChange: (week: WeekDocument) => void
  readOnly?: boolean
}

// Two-column panel 子表單只改 panel，但寫回仍要整份 week 與頁面位置
export type PanelEditorProps<P extends Panel> = Omit<
  PageEditorProps,
  "page"
> & {
  panel: P
}
