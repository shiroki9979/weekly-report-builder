import type {
  ChartPanel,
  ChecklistPanel,
  FlowPanel,
  TablePanel,
  TwoColumnWeekPage,
  WeekDocument,
  WeekPage,
  WeeklyOverviewPage,
  EvidenceDecisionPage,
  NextActionsPage,
} from "./week-document"
import { CARDINALITY } from "./week-document"
import { blankMetric } from "./evidence-decision-editor"
import { blankCommitment } from "./next-actions-editor"
import { blankOutcome } from "./weekly-overview-editor"

export type AddableTwoColumnPanelKind = "table" | "chart" | "flow" | "checklist"

export type PageLifecycleResult = {
  week: WeekDocument
  selectedPageId: string
}

export type PageMoveDirection = "up" | "down"

const PAGE_ID_PATTERN = /^p(\d+)$/

function blankItems(): TwoColumnWeekPage["items"] {
  return Array.from({ length: CARDINALITY.twoColumnItems.min }, () => ({
    heading: "",
    body: "",
  }))
}

function blankPanel(
  kind: AddableTwoColumnPanelKind
): TwoColumnWeekPage["panel"] {
  switch (kind) {
    case "table":
      return {
        kind: "table",
        title: "",
        columns: [""],
        rows: [{ cells: [""] }],
      } satisfies TablePanel
    case "chart":
      return {
        kind: "chart",
        title: "",
        categories: [""],
        series: [{ name: "", values: [0] }],
      } satisfies ChartPanel
    case "flow":
      return {
        kind: "flow",
        title: "",
        steps: [{ label: "" }],
      } satisfies FlowPanel
    case "checklist":
      return {
        kind: "checklist",
        title: "",
        items: [{ label: "" }],
      } satisfies ChecklistPanel
  }
}

export function nextPageId(existingIds: string[]): string {
  const used = new Set(existingIds)
  let nextNumber = 1

  for (const id of existingIds) {
    const match = PAGE_ID_PATTERN.exec(id)
    if (!match) {
      continue
    }

    const value = Number(match[1])
    if (value >= nextNumber) {
      nextNumber = value + 1
    }
  }

  while (used.has(formatPageId(nextNumber))) {
    nextNumber += 1
  }

  return formatPageId(nextNumber)
}

function formatPageId(value: number): string {
  return `p${String(value).padStart(2, "0")}`
}

export function createBlankTwoColumnPage(
  id: string,
  panelKind: AddableTwoColumnPanelKind
): TwoColumnWeekPage {
  return {
    id,
    layout: "two-column",
    title: "",
    items: blankItems(),
    panel: blankPanel(panelKind),
  }
}

export function createBlankWeeklyOverviewPage(id: string): WeeklyOverviewPage {
  return {
    id,
    layout: "weekly-overview",
    title: "",
    lead: blankOutcome(),
    supporting: [blankOutcome(), blankOutcome()],
  }
}

export function createBlankEvidenceDecisionPage(
  id: string
): EvidenceDecisionPage {
  return {
    id,
    layout: "evidence-decision",
    title: "",
    verdict: "",
    metrics: [blankMetric(), blankMetric()],
    interpretations: ["", ""],
  }
}

export function createBlankNextActionsPage(id: string): NextActionsPage {
  return {
    id,
    layout: "next-actions",
    variant: "rows",
    title: "",
    commitments: [blankCommitment(), blankCommitment(), blankCommitment()],
  }
}

export type AddableLayout =
  "two-column" | "weekly-overview" | "evidence-decision" | "next-actions"

const BLANK_PAGE_FACTORIES: Record<
  AddableLayout,
  (id: string, panelKind: AddableTwoColumnPanelKind) => WeekPage
> = {
  "two-column": createBlankTwoColumnPage,
  "weekly-overview": createBlankWeeklyOverviewPage,
  "evidence-decision": createBlankEvidenceDecisionPage,
  "next-actions": createBlankNextActionsPage,
}

export function createBlankAddablePage(
  id: string,
  layout: AddableLayout,
  panelKind: AddableTwoColumnPanelKind
): WeekPage {
  return BLANK_PAGE_FACTORIES[layout](id, panelKind)
}

function requirePageIndex(week: WeekDocument, pageId: string): number {
  const index = week.pages.findIndex((page) => page.id === pageId)
  if (index === -1) {
    throw new Error(`Unknown page id: ${pageId}`)
  }

  return index
}

export function addPageAfter(
  week: WeekDocument,
  selectedPageId: string,
  page: WeekPage
): PageLifecycleResult {
  const selectedIndex = requirePageIndex(week, selectedPageId)
  const pages = [...week.pages]
  pages.splice(selectedIndex + 1, 0, page)

  return {
    week: { ...week, pages },
    selectedPageId: page.id,
  }
}

export function deleteSelectedPage(
  week: WeekDocument,
  selectedPageId: string
): PageLifecycleResult {
  if (week.pages.length <= 1) {
    throw new Error("Cannot delete the last page")
  }

  const selectedIndex = requirePageIndex(week, selectedPageId)
  const pages = week.pages.filter((page) => page.id !== selectedPageId)
  const nextPage = pages[selectedIndex] ?? pages[selectedIndex - 1]

  return {
    week: { ...week, pages },
    selectedPageId: nextPage.id,
  }
}

export function moveSelectedPage(
  week: WeekDocument,
  selectedPageId: string,
  direction: PageMoveDirection
): PageLifecycleResult {
  const selectedIndex = requirePageIndex(week, selectedPageId)
  const targetIndex = direction === "up" ? selectedIndex - 1 : selectedIndex + 1

  if (targetIndex < 0 || targetIndex >= week.pages.length) {
    return { week, selectedPageId }
  }

  const pages = [...week.pages]
  const [page] = pages.splice(selectedIndex, 1)
  pages.splice(targetIndex, 0, page)

  return {
    week: { ...week, pages },
    selectedPageId,
  }
}
