import type { Deck, Page } from "./deck.ts"

type PageUpdater<T extends Page> = (page: T) => T

// 給所有 page 編輯器與 Vite／server 共用；相對路徑避免 vite.config 解析不到 @/
export function updateDeckPage(
  deck: Deck,
  pageIndex: number,
  updater: PageUpdater<Page>
): Deck {
  const next = structuredClone(deck)
  const page = next.pages[pageIndex]
  if (!page) {
    throw new Error("Page not found")
  }
  next.pages[pageIndex] = updater(page)
  return next
}

// 以型別防衛與錯誤用語綁出專屬 updater，各版面編輯器不必各自包一層
export function typedPageUpdater<T extends Page>(
  guard: (page: Page) => page is T,
  typeLabel: string
) {
  return (deck: Deck, pageIndex: number, updater: PageUpdater<T>): Deck =>
    updateDeckPage(deck, pageIndex, (page) => {
      if (!guard(page)) {
        throw new Error(`Page ${page.id} is not ${typeLabel}`)
      }
      return updater(page)
    })
}
