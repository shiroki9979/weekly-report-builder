import {
  isEditorialFramePage,
  isHtmlPage,
  isSupportedStagePage,
  periodLabel,
  type Deck,
  type DeckTheme,
  type Page,
} from "./deck.ts"

export type PagePosition = { index: number; total: number }

// documentId 與顯示文字分開傳；HTML Page 靠它組資源路徑，不可由 Frame Label 反推
export type StagePageContext = {
  documentId: string
  theme: DeckTheme
  deckTitle?: string
  frameLabel: string | null
  hidden: boolean
  position: PagePosition | null
  showPageNumber: boolean
}

export function createStagePageContext(
  documentId: string,
  deck: Deck,
  pageId: string
): StagePageContext {
  const page = deck.pages.find((entry) => entry.id === pageId)
  if (!page) throw new Error(`Unknown page id: ${pageId}`)

  return {
    documentId,
    theme: deck.theme ?? "default",
    ...(deck.title ? { deckTitle: deck.title } : {}),
    frameLabel: deck.period ? periodLabel(deck.period) : null,
    hidden: page.hidden === true,
    position: getPagePosition(deck.pages, pageId),
    showPageNumber: isPageNumberVisible(deck, page),
  }
}

export function getPagePosition(
  pages: Page[],
  pageId: string
): PagePosition | null {
  const visiblePages = pages.filter(
    (page) => isSupportedStagePage(page) && !page.hidden
  )
  const index = visiblePages.findIndex((page) => page.id === pageId)
  return index === -1 ? null : { index: index + 1, total: visiblePages.length }
}

export function formatPagePosition(
  position: PagePosition | null
): string | null {
  return position ? `${position.index} / ${position.total}` : null
}

// 主題以 CSS 切換補零版本（§ 03、03 / 10），補零規則只在這裡定一次
export function padPageNumber(value: number): string {
  return value.toString().padStart(2, "0")
}

// 頁碼位置就是頁尾：Editorial Frame 自帶，HTML Page 由 Stage 疊上；Cover 與未知版型沒有
function hasPageNumberSlot(page: Page): boolean {
  return isEditorialFramePage(page) || isHtmlPage(page)
}

/**
 * 單頁未覆寫時的頁碼可見性。HTML Page 的片段可能自帶頁碼，
 * 疊加 overlay 會改變既有輸出，所以不繼承 Deck 層級預設、須逐頁開啟。
 */
export function defaultPageNumberVisibility(
  deck: Deck | null,
  page?: Page
): boolean {
  if (page && isHtmlPage(page)) {
    return false
  }
  return deck?.showPageNumbers ?? true
}

/**
 * 頁碼只畫在 Editorial 與 HTML。隱藏頁已有 Hidden 標記，不再疊一次。
 * 單頁設定優先於預設。
 */
export function isPageNumberVisible(deck: Deck, page: Page): boolean {
  if (page.hidden || !hasPageNumberSlot(page)) {
    return false
  }
  return page.showPageNumber ?? defaultPageNumberVisibility(deck, page)
}

// HTML Page 須逐頁開啟；其餘版型回到 Deck 預設，範本不沿用頁碼覆寫。
export function templatePageNumberOverride(page: Page): boolean | undefined {
  return isHtmlPage(page) ? page.showPageNumber : undefined
}
