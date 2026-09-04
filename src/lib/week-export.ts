import {
  isHtmlWeekPage,
  isTwoColumnWeekPage,
  type WeekDocument,
  type WeekPage,
} from "./week-document"

export function listExportablePages(week: WeekDocument): WeekPage[] {
  return week.pages.filter(
    (page) =>
      !page.hidden && (isTwoColumnWeekPage(page) || isHtmlWeekPage(page))
  )
}

export function exportFileName(monday: string, pageId: string): string {
  return `${monday}-${pageId}.png`
}

export type ExportVisiblePagesDeps = {
  capture: (element: HTMLElement) => Promise<Blob>
  download: (blob: Blob, fileName: string) => void
  renderPage: (page: WeekPage) => Promise<HTMLElement>
}

export async function exportVisiblePages(
  monday: string,
  week: WeekDocument,
  deps: ExportVisiblePagesDeps
): Promise<void> {
  for (const page of listExportablePages(week)) {
    const element = await deps.renderPage(page)
    const blob = await deps.capture(element)
    deps.download(blob, exportFileName(monday, page.id))
  }
}
