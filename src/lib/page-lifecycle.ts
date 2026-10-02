import type {
  ChartPanel,
  ChecklistPanel,
  FlowPanel,
  TablePanel,
  TwoColumnPage,
  Deck,
  Page,
  OverviewPage,
  EvidenceDecisionPage,
  NextActionsPage,
  TrendTargetPage,
} from "./deck"
import { CARDINALITY } from "./deck"
import { blankMetric } from "./evidence-decision-editor"
import { blankCommitment } from "./next-actions-editor"
import { blankOutcome } from "./overview-editor"

// 新增選單的選項與輸入驗證都由這份清單推導，不另列字串
export const ADDABLE_PANEL_KINDS = [
  "table",
  "chart",
  "flow",
  "checklist",
] as const

export type AddableTwoColumnPanelKind = (typeof ADDABLE_PANEL_KINDS)[number]

export function isAddablePanelKind(
  value: unknown
): value is AddableTwoColumnPanelKind {
  return (ADDABLE_PANEL_KINDS as readonly unknown[]).includes(value)
}

export type PageLifecycleResult = {
  deck: Deck
  selectedPageId: string
}

export type PageMoveDirection = "up" | "down"

const PAGE_ID_PATTERN = /^p(\d+)$/

function blankItems(): TwoColumnPage["items"] {
  return Array.from({ length: CARDINALITY.twoColumnItems.min }, () => ({
    heading: "",
    body: "",
  }))
}

function blankPanel(kind: AddableTwoColumnPanelKind): TwoColumnPage["panel"] {
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
): TwoColumnPage {
  return {
    id,
    layout: "two-column",
    title: "",
    items: blankItems(),
    panel: blankPanel(panelKind),
  }
}

export function createBlankOverviewPage(id: string): OverviewPage {
  return {
    id,
    layout: "overview",
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

// 規格指定新頁起始為八個 Unfilled 位置，作者可再增減端點
const DEFAULT_TREND_POSITIONS = 8

export function createBlankTrendTargetPage(id: string): TrendTargetPage {
  return {
    id,
    layout: "trend-target",
    title: "",
    metric: {
      label: "",
      unit: "",
      unitPosition: "after",
      unitSpacing: "space",
      precision: 1,
    },
    cadence: "week",
    start: null,
    observations: Array.from({ length: DEFAULT_TREND_POSITIONS }, () => ({
      state: "unfilled",
    })),
    target: null,
    direction: "at-most",
    interpretation: "",
    measurementContext: "",
  }
}

export type AddableLayout =
  | "two-column"
  | "overview"
  | "evidence-decision"
  | "next-actions"
  | "trend-target"

const BLANK_PAGE_FACTORIES: Record<
  AddableLayout,
  (id: string, panelKind: AddableTwoColumnPanelKind) => Page
> = {
  "two-column": createBlankTwoColumnPage,
  overview: createBlankOverviewPage,
  "evidence-decision": createBlankEvidenceDecisionPage,
  "next-actions": createBlankNextActionsPage,
  "trend-target": createBlankTrendTargetPage,
}

// 新增選單依工廠表的鍵列出版型，新增版型只需在工廠表登記一次
export const ADDABLE_LAYOUTS = Object.keys(
  BLANK_PAGE_FACTORIES
) as AddableLayout[]

export function isAddableLayout(value: unknown): value is AddableLayout {
  return typeof value === "string" && Object.hasOwn(BLANK_PAGE_FACTORIES, value)
}

export function createBlankAddablePage(
  id: string,
  layout: AddableLayout,
  panelKind: AddableTwoColumnPanelKind
): Page {
  return BLANK_PAGE_FACTORIES[layout](id, panelKind)
}

function requirePageIndex(deck: Deck, pageId: string): number {
  const index = deck.pages.findIndex((page) => page.id === pageId)
  if (index === -1) {
    throw new Error(`Unknown page id: ${pageId}`)
  }

  return index
}

export function addPageAfter(
  deck: Deck,
  selectedPageId: string,
  page: Page
): PageLifecycleResult {
  const selectedIndex = requirePageIndex(deck, selectedPageId)
  const pages = [...deck.pages]
  pages.splice(selectedIndex + 1, 0, page)

  return {
    deck: { ...deck, pages },
    selectedPageId: page.id,
  }
}

export function deleteSelectedPage(
  deck: Deck,
  selectedPageId: string
): PageLifecycleResult {
  if (deck.pages.length <= 1) {
    throw new Error("Cannot delete the last page")
  }

  const selectedIndex = requirePageIndex(deck, selectedPageId)
  const pages = deck.pages.filter((page) => page.id !== selectedPageId)
  const nextPage = pages[selectedIndex] ?? pages[selectedIndex - 1]

  return {
    deck: { ...deck, pages },
    selectedPageId: nextPage.id,
  }
}

export function moveSelectedPage(
  deck: Deck,
  selectedPageId: string,
  direction: PageMoveDirection
): PageLifecycleResult {
  const selectedIndex = requirePageIndex(deck, selectedPageId)
  const targetIndex = direction === "up" ? selectedIndex - 1 : selectedIndex + 1

  if (targetIndex < 0 || targetIndex >= deck.pages.length) {
    return { deck, selectedPageId }
  }

  const pages = [...deck.pages]
  const [page] = pages.splice(selectedIndex, 1)
  pages.splice(targetIndex, 0, page)

  return {
    deck: { ...deck, pages },
    selectedPageId,
  }
}
