import { isSupportedStagePage, type WeekDocument } from "./week-document"

export type StagePageContext = {
  weekLabel: string
  pageLabel: string
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

  if (page.hidden) {
    return { weekLabel, pageLabel: "Hidden" }
  }

  const supportedVisible = week.pages.filter(
    (entry) => isSupportedStagePage(entry) && !entry.hidden
  )
  const position = supportedVisible.findIndex((entry) => entry.id === pageId)
  if (position === -1) {
    return { weekLabel, pageLabel: "" }
  }

  return {
    weekLabel,
    pageLabel: `${position + 1} / ${supportedVisible.length}`,
  }
}

export function mondayFromWeekLabel(weekLabel: string): string {
  return weekLabel.slice(0, 10)
}
