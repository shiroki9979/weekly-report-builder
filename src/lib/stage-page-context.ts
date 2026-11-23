import {
  isEditorialFramePage,
  isHtmlPage,
  isStructuredPage,
  isSupportedStagePage,
  periodLabel,
  type Deck,
  type DeckTheme,
  type Page,
} from "./deck.ts"

export type PagePosition = { index: number; total: number }

// position 只在這頁顯示頁碼時才有值；Editorial Frame 的 § nn 也讀它，兩者才不會各自判斷
export type StageFooter = { deckTitle?: string; position: PagePosition | null }

// documentId 與顯示文字分開傳；HTML Page 靠它組資源路徑，不可由 Frame Label 反推
export type StagePageContext = {
  documentId: string
  theme: DeckTheme
  frameLabel: string | null
  hidden: boolean
  // 頁尾畫不畫、放什麼都在這裡解析完，renderer 只照著畫。null 只出現在 HTML Page 與未知版型；
  // Editorial Frame 與 Cover 靠頁尾那一列保留底部留白，手組 context 時不可給 null
  footer: StageFooter | null
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
    frameLabel: deck.period ? periodLabel(deck.period) : null,
    hidden: page.hidden === true,
    footer: resolveFooter(deck, page),
  }
}

/**
 * Editorial Frame 與 Cover 的頁尾是外框的一部分，一律畫出；頁碼關閉時只少了 Page Position。
 * HTML Page 的頁尾是疊在片段上的 overlay，片段可能自帶頁尾，所以只在顯示頁碼時才整組畫出。
 */
function resolveFooter(deck: Deck, page: Page): StageFooter | null {
  const position = isPageNumberVisible(deck, page)
    ? getPagePosition(deck.pages, page.id)
    : null
  const footer = { ...(deck.title ? { deckTitle: deck.title } : {}), position }

  if (isHtmlPage(page)) return position ? footer : null
  return isStructuredPage(page) ? footer : null
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

// 頁碼位置就是頁尾：Editorial Frame 自帶，HTML Page 由 Stage 疊上；Cover 與未知版型沒有。
// Workshop 也問這裡，編輯器才不會另寫一份「哪些頁有頁碼選單」的規則
export function hasPageNumberSlot(page: Page): boolean {
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
function isPageNumberVisible(deck: Deck, page: Page): boolean {
  if (page.hidden || !hasPageNumberSlot(page)) {
    return false
  }
  return page.showPageNumber ?? defaultPageNumberVisibility(deck, page)
}

// HTML Page 須逐頁開啟；其餘版型回到 Deck 預設，範本不沿用頁碼覆寫。
export function templatePageNumberOverride(page: Page): boolean | undefined {
  return isHtmlPage(page) ? page.showPageNumber : undefined
}
