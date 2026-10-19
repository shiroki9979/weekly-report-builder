import {
  matchPage,
  nextActionsVariant,
  type DeckPeriod,
  type Outcome,
  type Panel,
  type Deck,
  type Page,
} from "./deck.ts"
import { blankCommitment } from "./next-actions-editor.ts"

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

function clearPage(page: Page): Page {
  // 泛型只會從第一個分支推斷，不指定的話後面的 layout 會被收成 html
  return matchPage<Page>(page, {
    // HTML Page 的頁碼須逐頁開啟、不吃 Deck 層級預設；沿用範本的選擇，新 Deck 才不必逐頁重開
    html: (htmlPage) => ({
      id: htmlPage.id,
      layout: "html",
      title: "",
      htmlFile: htmlPage.htmlFile,
      hidden: htmlPage.hidden,
      notes: undefined,
      showPageNumber: htmlPage.showPageNumber,
    }),
    overview: (overview) => ({
      id: overview.id,
      layout: "overview",
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

// 保留版型、頁序與結構，清空作者文字；期間由呼叫端依用途決定（週報流程給週一到週五，其他 Deck 可不給）
export function createDeckFromTemplate(
  template: Deck,
  options: { period?: DeckPeriod } = {}
): Deck {
  // Editorial 頁碼回到預設顯示，不沿用範本的開關，否則從隱藏頁碼的範本建立會改變既有輸出
  return {
    ...(options.period ? { period: options.period } : {}),
    pages: template.pages.map(clearPage),
  }
}
