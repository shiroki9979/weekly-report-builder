import { isEditorialFramePage, type EditorialFrameLayout } from "@/lib/deck"
import { ADDABLE_LAYOUTS, createBlankAddablePage } from "@/lib/page-lifecycle"

// tests/ 不在 npm run typecheck 範圍內，以版型為 key 的對照表其 Record 涵蓋只在編輯器生效；
// 以新增選單的版型清單在執行期補上同樣的保證，各測試共用同一份來源。
// 依空白頁實際形狀篩選，而非另列一份版型名單，避免與受測清單同構
export const ADDABLE_EDITORIAL_FRAME_LAYOUTS: EditorialFrameLayout[] =
  ADDABLE_LAYOUTS.flatMap((layout) => {
    const page = createBlankAddablePage("p01", layout, "table")
    return isEditorialFramePage(page) ? [page.layout] : []
  }).sort()
