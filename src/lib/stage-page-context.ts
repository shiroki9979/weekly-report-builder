import {
  isHtmlPage,
  matchPage,
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

// 經 matchPage 分派：新增版型時編譯器會要求決定它是否保留頁碼位置
function hasPageNumberSlot(page: Page): boolean {
  return matchPage(page, {
    cover: () => false,
    closing: () => true,
    sideBySide: () => true,
    fullWidthPanel: () => true,
    html: () => true,
    overview: () => true,
    evidenceDecision: () => true,
    nextActions: () => true,
    trendTarget: () => true,
    twoColumn: () => false,
    unknown: () => false,
  })
}

/**
 * 單頁未覆寫時的頁碼可見性。HTML Page 的片段可能自帶頁碼，
 * 疊加 overlay 會改變既有輸出，所以不繼承週層級預設、須逐頁開啟。
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
