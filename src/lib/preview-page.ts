import type { WeekDocument } from "@/lib/week-document"

export function getPreviewPage(week: WeekDocument) {
  return week.pages.find((page) => !page.hidden) ?? week.pages[0]
}
