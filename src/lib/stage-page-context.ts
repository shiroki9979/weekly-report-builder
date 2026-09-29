import {
  isPageNumberVisible,
  isSupportedStagePage,
  type WeekDocument,
} from "./week-document"

// documentId 是儲存層的文件識別，與給人看的 weekLabel 分開傳；HTML Page 靠它組資源路徑，不可由顯示文字反推
export type StagePageContext = {
  documentId: string
  weekLabel: string
  pageLabel: string
  showPageNumber: boolean
}

export function createStagePageContext(
  documentId: string,
  week: WeekDocument,
  pageId: string
): StagePageContext {
  const page = week.pages.find((entry) => entry.id === pageId)
  if (!page) {
    throw new Error(`Unknown page id: ${pageId}`)
  }

  const weekLabel = `${week.start} — ${week.end}`
  const showPageNumber = isPageNumberVisible(week, page)

  if (page.hidden) {
    return { documentId, weekLabel, pageLabel: "Hidden", showPageNumber }
  }

  const supportedVisible = week.pages.filter(
    (entry) => isSupportedStagePage(entry) && !entry.hidden
  )
  const position = supportedVisible.findIndex((entry) => entry.id === pageId)
  if (position === -1) {
    return { documentId, weekLabel, pageLabel: "", showPageNumber }
  }

  return {
    documentId,
    weekLabel,
    pageLabel: `${position + 1} / ${supportedVisible.length}`,
    showPageNumber,
  }
}
