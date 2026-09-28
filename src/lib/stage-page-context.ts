import {
  isPageNumberVisible,
  isSupportedStagePage,
  type WeekDocument,
} from "./week-document"

export type StagePageContext = {
  weekLabel: string
  pageLabel: string
  showPageNumber: boolean
}

export function createStagePageContext(
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
    return { weekLabel, pageLabel: "Hidden", showPageNumber }
  }

  const supportedVisible = week.pages.filter(
    (entry) => isSupportedStagePage(entry) && !entry.hidden
  )
  const position = supportedVisible.findIndex((entry) => entry.id === pageId)
  if (position === -1) {
    return { weekLabel, pageLabel: "", showPageNumber }
  }

  return {
    weekLabel,
    pageLabel: `${position + 1} / ${supportedVisible.length}`,
    showPageNumber,
  }
}

export function mondayFromWeekLabel(weekLabel: string): string {
  return weekLabel.slice(0, 10)
}
