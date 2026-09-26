import type { WeekDocument, WeekPage } from "./week-document"

type PageUpdater<T extends WeekPage> = (page: T) => T

// 給所有 page 編輯器與 Vite／server 共用；相對路徑避免 vite.config 解析不到 @/
export function updateWeekPage(
  week: WeekDocument,
  pageIndex: number,
  updater: PageUpdater<WeekPage>
): WeekDocument {
  const next = structuredClone(week)
  const page = next.pages[pageIndex]
  if (!page) {
    throw new Error("Week Page not found")
  }
  next.pages[pageIndex] = updater(page)
  return next
}

// 以型別防衛與錯誤用語綁出專屬 updater，各版面編輯器不必各自包一層
export function typedPageUpdater<T extends WeekPage>(
  guard: (page: WeekPage) => page is T,
  typeLabel: string
) {
  return (
    week: WeekDocument,
    pageIndex: number,
    updater: PageUpdater<T>
  ): WeekDocument =>
    updateWeekPage(week, pageIndex, (page) => {
      if (!guard(page)) {
        throw new Error(`Week Page ${page.id} is not ${typeLabel}`)
      }
      return updater(page)
    })
}
