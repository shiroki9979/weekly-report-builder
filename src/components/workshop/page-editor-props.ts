import type { WeekDocument, WeekPage } from "@/lib/week-document"

// 各 page 編輯表單共用的輸入組合；新增共用欄位只改這裡
export type PageEditorProps<P extends WeekPage = WeekPage> = {
  week: WeekDocument
  pageIndex: number
  page: P
  onChange: (week: WeekDocument) => void
  readOnly?: boolean
}
