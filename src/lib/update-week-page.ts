import type { WeekDocument, WeekPage } from "./week-document"

// 給 Editorial Layout 編輯器與 Vite／server 共用；相對路徑避免 vite.config 解析不到 @/
export function updateTypedPage<T extends WeekPage>(
  week: WeekDocument,
  pageIndex: number,
  guard: (page: WeekPage) => page is T,
  typeLabel: string,
  updater: (page: T) => T
): WeekDocument {
  const next = structuredClone(week)
  const page = next.pages[pageIndex]
  if (!page) {
    throw new Error("Week Page not found")
  }
  if (!guard(page)) {
    throw new Error(`Week Page ${page.id} is not ${typeLabel}`)
  }
  next.pages[pageIndex] = updater(page)
  return next
}
