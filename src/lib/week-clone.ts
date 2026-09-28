import {
  matchWeekPage,
  nextActionsVariant,
  type Outcome,
  type Panel,
  type WeekDocument,
  type WeekPage,
} from "./week-document"
import { blankCommitment } from "./next-actions-editor"
import { isCalendarMonday } from "./week-id"

function parseMonday(value: string): Date {
  if (!isCalendarMonday(value)) {
    throw new Error(`Invalid date: ${value}`)
  }

  return new Date(`${value}T00:00:00Z`)
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function weekRangeForMonday(monday: string): {
  start: string
  end: string
} {
  const startDate = parseMonday(monday)
  const endDate = new Date(startDate)
  endDate.setUTCDate(endDate.getUTCDate() + 4)

  return {
    start: formatDate(startDate),
    end: formatDate(endDate),
  }
}

export function latestWeekMonday(weeks: string[]): string | null {
  if (weeks.length === 0) {
    return null
  }

  return weeks[weeks.length - 1]
}

export function nextMondayAfter(monday: string): string {
  const date = parseMonday(monday)
  date.setUTCDate(date.getUTCDate() + 7)
  return formatDate(date)
}

function clearPanel(panel: Panel): Panel {
  switch (panel.kind) {
    case "table":
      return {
        kind: "table",
        title: "",
        columns: panel.columns.map(() => ""),
        rows: panel.rows.map((row) => ({
          cells: row.cells.map(() => ""),
          emphasis: row.emphasis,
        })),
      }
    case "chart":
      return {
        kind: "chart",
        title: "",
        categories: panel.categories.map(() => ""),
        series: panel.series.map((series) => ({
          name: "",
          color: series.color,
          values: series.values.map(() => 0),
        })),
      }
    case "flow":
      return {
        kind: "flow",
        title: "",
        steps: panel.steps.map((step) => ({
          label: "",
          caption: undefined,
          variant: step.variant,
        })),
      }
    case "checklist":
      return {
        kind: "checklist",
        title: "",
        items: panel.items.map(() => ({ label: "", checked: undefined })),
      }
    case "fields":
      return {
        kind: "fields",
        title: "",
        rows: panel.rows.map(() => ({ label: "", value: "" })),
      }
  }
}

function clearOutcome(outcome: Outcome): Outcome {
  return {
    workstream: outcome.workstream,
    figure: "",
    result: "",
    impact: "",
    status: { label: "", tone: "neutral" },
  }
}

function clearPage(page: WeekPage): WeekPage {
  // 泛型只會從第一個分支推斷，不指定的話後面的 layout 會被收成 html
  return matchWeekPage<WeekPage>(page, {
    // HTML Page 的頁碼須逐頁開啟、不吃週層級預設；沿用上週選擇才不會每週重開
    html: (htmlPage) => ({
      id: htmlPage.id,
      layout: "html",
      title: "",
      htmlFile: htmlPage.htmlFile,
      hidden: htmlPage.hidden,
      notes: undefined,
      showPageNumber: htmlPage.showPageNumber,
    }),
    weeklyOverview: (overview) => ({
      id: overview.id,
      layout: "weekly-overview",
      title: "",
      lead: clearOutcome(overview.lead),
      supporting: overview.supporting.map(clearOutcome),
      hidden: overview.hidden,
      notes: undefined,
    }),
    evidenceDecision: (decision) => ({
      id: decision.id,
      layout: "evidence-decision",
      title: "",
      verdict: "",
      metrics: decision.metrics.map((metric) => ({
        ...metric,
        baselineValue: null,
        candidateValue: null,
      })),
      interpretations: decision.interpretations.map(() => ""),
      hidden: decision.hidden,
      notes: undefined,
    }),
    nextActions: (actions) => ({
      id: actions.id,
      layout: "next-actions",
      variant: nextActionsVariant(actions),
      title: "",
      commitments: actions.commitments.map(() => blankCommitment()),
      hidden: actions.hidden,
      notes: undefined,
    }),
    trendTarget: (trend) => ({
      ...trend,
      title: "",
      interpretation: "",
      notes: undefined,
      showPageNumber: undefined,
    }),
    twoColumn: (twoColumn) => ({
      id: twoColumn.id,
      layout: twoColumn.layout,
      title: "",
      items: twoColumn.items.map(() => ({ heading: "", body: "" })),
      panel: clearPanel(twoColumn.panel),
      hidden: twoColumn.hidden,
      notes: undefined,
    }),
    unknown: (unknown) => ({
      ...unknown,
      title: "",
      notes: undefined,
      showPageNumber: undefined,
    }),
  })
}

export function cloneWeekFromPrevious(
  previous: WeekDocument,
  targetMonday: string
): WeekDocument {
  if (!isCalendarMonday(targetMonday)) {
    throw new Error(`Week file name must be a Monday date: ${targetMonday}`)
  }

  const range = weekRangeForMonday(targetMonday)

  // 新週的 Editorial 頁碼回到預設顯示，不沿用上一週的開關，否則從隱藏頁碼的週次建立會改變既有輸出
  return {
    start: range.start,
    end: range.end,
    pages: previous.pages.map(clearPage),
  }
}
