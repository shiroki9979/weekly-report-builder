import type { Panel, WeekDocument, WeekPage } from "@/lib/week-document"
import type { ExportIssue } from "@/lib/export-readiness"
import type { MetricValueField } from "@/lib/metric-input"

export type MetricEditorControls = {
  read: (pageId: string, metricIndex: number, field: MetricValueField) => string
  write: (
    pageId: string,
    metricIndex: number,
    field: MetricValueField,
    raw: string
  ) => void
  move: (pageId: string, fromIndex: number, toIndex: number) => void
  remove: (pageId: string, metricIndex: number) => void
  readiness: (pageId: string) => ExportIssue[]
}

// 各 page 編輯表單共用的輸入組合；新增共用欄位只改這裡
export type PageEditorProps<P extends WeekPage = WeekPage> = {
  week: WeekDocument
  pageIndex: number
  page: P
  onChange: (update: (week: WeekDocument) => WeekDocument) => void
  metricControls?: MetricEditorControls
  readOnly?: boolean
}

// Two-column panel 子表單只改 panel，但寫回仍要整份 week 與頁面位置。
// 唯讀由外層 fieldset 的 disabled 處理，不另收 readOnly，避免型別宣稱支援卻被忽略
export type PanelEditorProps<P extends Panel> = Omit<
  PageEditorProps,
  "page" | "readOnly"
> & {
  panel: P
}
