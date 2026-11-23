import {
  inSavedKeyOrder,
  isEditorialFramePage,
  matchPage,
  nextActionsVariant,
  type DeckPeriod,
  type Outcome,
  type Panel,
  type Deck,
  type Page,
} from "./deck.ts"
import {
  editorialFrameTemplateChrome,
  pageTemplateChrome,
} from "./page-chrome.ts"
import { templatePageNumberOverride } from "./stage-page-context.ts"
import { blankCommitment } from "./next-actions-editor.ts"

// 版型專屬內容；chrome 欄位由 templateChrome 依政策補上，arm 寫了也會被覆寫
type PageContent = { id: string; layout: string; [field: string]: unknown }

function clearPanel(panel: Panel): Panel {
  switch (panel.kind) {
    case "table":
      return {
        kind: "table",
        title: "",
        columns: panel.columns.map(() => ""),
        ...(panel.referenceColumn === undefined
          ? {}
          : { referenceColumn: panel.referenceColumn }),
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
  return inSavedKeyOrder({
    ...clearPageContent(page),
    ...templateChrome(page),
  } as Page)
}

// chrome 依欄位政策處理（見 page-chrome.ts），與版型專屬內容分開：新版型只要納入 Editorial Frame 就自動套用
function templateChrome(page: Page) {
  const delegated = { showPageNumber: templatePageNumberOverride(page) }
  return isEditorialFramePage(page)
    ? editorialFrameTemplateChrome(page, delegated)
    : pageTemplateChrome(page, delegated)
}

function clearPageContent(page: Page): PageContent {
  // 泛型只會從第一個分支推斷，不指定的話後面的 layout 會被收成 html
  return matchPage<PageContent>(page, {
    fullWidthPanel: (fullWidth) => ({
      ...fullWidth,
      panel: clearPanel(fullWidth.panel),
    }),
    sideBySide: (comparison) => ({
      ...comparison,
      columns: [
        { label: "", points: comparison.columns[0].points.map(() => "") },
        { label: "", points: comparison.columns[1].points.map(() => "") },
      ],
      chosen: undefined,
      tradeoff: undefined,
    }),
    cover: (cover) => ({ ...cover, subtitle: "" }),
    closing: (closing) => ({ ...closing, takeaways: [] }),
    html: (htmlPage) => ({
      id: htmlPage.id,
      layout: "html",
      htmlFile: htmlPage.htmlFile,
    }),
    overview: (overview) => ({
      id: overview.id,
      layout: "overview",
      lead: clearOutcome(overview.lead),
      supporting: overview.supporting.map(clearOutcome),
    }),
    evidenceDecision: (decision) => ({
      id: decision.id,
      layout: "evidence-decision",
      verdict: "",
      metrics: decision.metrics.map((metric) => ({
        ...metric,
        baselineValue: null,
        candidateValue: null,
      })),
      interpretations: decision.interpretations.map(() => ""),
    }),
    nextActions: (actions) => ({
      id: actions.id,
      layout: "next-actions",
      variant: nextActionsVariant(actions),
      commitments: actions.commitments.map(() => blankCommitment()),
    }),
    trendTarget: (trend) => ({ ...trend, interpretation: "" }),
    twoColumn: (twoColumn) => ({
      id: twoColumn.id,
      layout: twoColumn.layout,
      items: twoColumn.items.map(() => ({ heading: "", body: "" })),
      panel: clearPanel(twoColumn.panel),
    }),
    unknown: (unknown) => unknown,
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
    ...(template.theme !== undefined ? { theme: template.theme } : {}),
    ...(template.title !== undefined ? { title: template.title } : {}),
    pages: template.pages.map(clearPage),
  }
}
