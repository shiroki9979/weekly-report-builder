import {
  isPageNumberVisible,
  isSupportedStagePage,
  periodLabel,
  type Deck,
} from "./deck"

// documentId 是儲存層的文件識別，與給人看的 frameLabel 分開傳；HTML Page 靠它組資源路徑，不可由顯示文字反推
export type StagePageContext = {
  documentId: string
  // 由 Deck 期間產生；沒有期間時為空字串，Editorial Frame 不顯示該行
  frameLabel: string
  pageLabel: string
  showPageNumber: boolean
}

export function createStagePageContext(
  documentId: string,
  deck: Deck,
  pageId: string
): StagePageContext {
  const page = deck.pages.find((entry) => entry.id === pageId)
  if (!page) {
    throw new Error(`Unknown page id: ${pageId}`)
  }

  const frameLabel = periodLabel(deck.period)
  const showPageNumber = isPageNumberVisible(deck, page)

  if (page.hidden) {
    return { documentId, frameLabel, pageLabel: "Hidden", showPageNumber }
  }

  const supportedVisible = deck.pages.filter(
    (entry) => isSupportedStagePage(entry) && !entry.hidden
  )
  const position = supportedVisible.findIndex((entry) => entry.id === pageId)
  if (position === -1) {
    return { documentId, frameLabel, pageLabel: "", showPageNumber }
  }

  return {
    documentId,
    frameLabel,
    pageLabel: `${position + 1} / ${supportedVisible.length}`,
    showPageNumber,
  }
}
