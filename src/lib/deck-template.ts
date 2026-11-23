import {
  inSavedKeyOrder,
  isEditorialFramePage,
  matchPage,
  nextActionsVariant,
  type DeckPeriod,
  type Outcome,
  type Panel,
  type Deck,
  type EditorialFramePage,
  type EditorialPageChrome,
  type Page,
  type PageChrome,
} from "./deck.ts"
import { templatePageNumberOverride } from "./stage-page-context.ts"
import { blankCommitment } from "./next-actions-editor.ts"

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
  return inSavedKeyOrder({ ...clearPageContent(page), ...templateChrome(page) })
}

// chrome 依來源頁決定、與版型專屬內容分開處理：新版型只要納入 Editorial Frame 就自動套用，不必逐一接線
function templateChrome(page: Page): PageChrome {
  return isEditorialFramePage(page)
    ? editorialFrameTemplateChrome(page)
    : pageTemplateChrome(page)
}

// 講稿屬於當週內容不沿用；頁碼覆寫依現行規則回到 Deck 預設（HTML Page 例外，見 templatePageNumberOverride）
function pageTemplateChrome(page: Page): PageChrome {
  return { notes: undefined, showPageNumber: templatePageNumberOverride(page) }
}

// Boundary Note 描述的是當週主張的成立範圍，換一週就不再成立；
// Eyebrow 寫的是這一頁的溝通任務，沿用頁面結構時一併保留
function editorialFrameTemplateChrome(
  page: EditorialFramePage
): EditorialPageChrome {
  return {
    ...pageTemplateChrome(page),
    ...(page.eyebrow === undefined ? {} : { eyebrow: page.eyebrow }),
    boundary: undefined,
  }
}

function clearPageContent(page: Page): Page {
  // 泛型只會從第一個分支推斷，不指定的話後面的 layout 會被收成 html
  return matchPage<Page>(page, {
    fullWidthPanel: (fullWidth) => ({
      ...fullWidth,
      title: "",
      panel: clearPanel(fullWidth.panel),
    }),
    sideBySide: (comparison) => ({
      ...comparison,
      title: "",
      columns: [
        { label: "", points: comparison.columns[0].points.map(() => "") },
        { label: "", points: comparison.columns[1].points.map(() => "") },
      ],
      chosen: undefined,
      tradeoff: undefined,
    }),
    cover: (cover) => ({ ...cover, title: "", subtitle: "" }),
    closing: (closing) => ({ ...closing, title: "", takeaways: [] }),
    html: (htmlPage) => ({
      id: htmlPage.id,
      layout: "html",
      title: "",
      htmlFile: htmlPage.htmlFile,
      hidden: htmlPage.hidden,
    }),
    overview: (overview) => ({
      id: overview.id,
      layout: "overview",
      title: "",
      lead: clearOutcome(overview.lead),
      supporting: overview.supporting.map(clearOutcome),
      hidden: overview.hidden,
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
    }),
    nextActions: (actions) => ({
      id: actions.id,
      layout: "next-actions",
      variant: nextActionsVariant(actions),
      title: "",
      commitments: actions.commitments.map(() => blankCommitment()),
      hidden: actions.hidden,
    }),
    trendTarget: (trend) => ({
      ...trend,
      title: "",
      interpretation: "",
    }),
    twoColumn: (twoColumn) => ({
      id: twoColumn.id,
      layout: twoColumn.layout,
      title: "",
      items: twoColumn.items.map(() => ({ heading: "", body: "" })),
      panel: clearPanel(twoColumn.panel),
      hidden: twoColumn.hidden,
    }),
    unknown: (unknown) => ({
      ...unknown,
      title: "",
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
    ...(template.theme !== undefined ? { theme: template.theme } : {}),
    ...(template.title !== undefined ? { title: template.title } : {}),
    pages: template.pages.map(clearPage),
  }
}
