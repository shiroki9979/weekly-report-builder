import { typedPageUpdater, updateWeekPage } from "@/lib/update-week-page"
import { isHtmlWeekPage, isTwoColumnWeekPage } from "@/lib/week-document"
import type { Panel, WeekDocument } from "@/lib/week-document"

const updateTwoColumnPage = typedPageUpdater(
  isTwoColumnWeekPage,
  "a two-column page"
)

const updateHtmlPage = typedPageUpdater(isHtmlWeekPage, "an HTML page")

type PanelOfKind<K extends Panel["kind"]> = Extract<Panel, { kind: K }>

// 各 panel 編輯函式共用同一個 two-column 與 panel kind 防衛，不再各寫一份 require*Panel
function panelUpdater<K extends Panel["kind"]>(kind: K) {
  return (
    week: WeekDocument,
    pageIndex: number,
    updater: (panel: PanelOfKind<K>) => PanelOfKind<K>
  ): WeekDocument =>
    updateTwoColumnPage(week, pageIndex, (page) => {
      if (page.panel.kind !== kind) {
        throw new Error(`Week Page ${page.id} does not have a ${kind} panel`)
      }
      // 泛型 K 無法讓 TS 從 kind 比較收窄 union，上面的執行期檢查已保證型別
      return { ...page, panel: updater(page.panel as PanelOfKind<K>) }
    })
}

const updateTablePanel = panelUpdater("table")
const updateChartPanel = panelUpdater("chart")
const updateFlowPanel = panelUpdater("flow")
const updateChecklistPanel = panelUpdater("checklist")

function moveItems<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) {
    return items
  }

  const next = [...items]
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
}

export function setPageTitle(
  week: WeekDocument,
  pageIndex: number,
  title: string
): WeekDocument {
  return updateWeekPage(week, pageIndex, (page) => ({ ...page, title }))
}

export function setPageHtmlFile(
  week: WeekDocument,
  pageIndex: number,
  htmlFile: string
): WeekDocument {
  return updateHtmlPage(week, pageIndex, (page) => ({ ...page, htmlFile }))
}

export function setPageItem(
  week: WeekDocument,
  pageIndex: number,
  itemIndex: number,
  field: "heading" | "body",
  value: string
): WeekDocument {
  return updateTwoColumnPage(week, pageIndex, (page) => ({
    ...page,
    items: page.items.map((item, index) =>
      index === itemIndex ? { ...item, [field]: value } : item
    ),
  }))
}

export function setPageNotes(
  week: WeekDocument,
  pageIndex: number,
  notes: string
): WeekDocument {
  return updateWeekPage(week, pageIndex, (page) => ({
    ...page,
    notes: notes === "" ? undefined : notes,
  }))
}

export function setPageHidden(
  week: WeekDocument,
  pageIndex: number,
  hidden: boolean
): WeekDocument {
  return updateWeekPage(week, pageIndex, (page) => ({
    ...page,
    hidden: hidden ? true : undefined,
  }))
}

export function setWeekShowPageNumbers(
  week: WeekDocument,
  showPageNumbers: boolean
): WeekDocument {
  return {
    ...week,
    showPageNumbers,
  }
}

export function setPageShowPageNumber(
  week: WeekDocument,
  pageIndex: number,
  showPageNumber: boolean | undefined
): WeekDocument {
  return updateWeekPage(week, pageIndex, (page) => ({
    ...page,
    showPageNumber,
  }))
}

export function setTablePanelTitle(
  week: WeekDocument,
  pageIndex: number,
  title: string
): WeekDocument {
  return updateTablePanel(week, pageIndex, (panel) => ({ ...panel, title }))
}

export function setTablePanelCell(
  week: WeekDocument,
  pageIndex: number,
  rowIndex: number,
  cellIndex: number,
  value: string
): WeekDocument {
  return updateTablePanel(week, pageIndex, (panel) => ({
    ...panel,
    rows: panel.rows.map((row, index) =>
      index === rowIndex
        ? {
            ...row,
            cells: row.cells.map((cell, columnIndex) =>
              columnIndex === cellIndex ? value : cell
            ),
          }
        : row
    ),
  }))
}

export function setTablePanelColumn(
  week: WeekDocument,
  pageIndex: number,
  columnIndex: number,
  value: string
): WeekDocument {
  return updateTablePanel(week, pageIndex, (panel) => ({
    ...panel,
    columns: panel.columns.map((column, index) =>
      index === columnIndex ? value : column
    ),
  }))
}

export function addTableRow(
  week: WeekDocument,
  pageIndex: number
): WeekDocument {
  return updateTablePanel(week, pageIndex, (panel) => ({
    ...panel,
    rows: [...panel.rows, { cells: panel.columns.map(() => "") }],
  }))
}

export function removeTableRow(
  week: WeekDocument,
  pageIndex: number,
  rowIndex: number
): WeekDocument {
  return updateTablePanel(week, pageIndex, (panel) => {
    if (panel.rows.length <= 1) {
      throw new Error("Table must keep at least one row")
    }

    return {
      ...panel,
      rows: panel.rows.filter((_, index) => index !== rowIndex),
    }
  })
}

export function addTableColumn(
  week: WeekDocument,
  pageIndex: number
): WeekDocument {
  return updateTablePanel(week, pageIndex, (panel) => ({
    ...panel,
    columns: [...panel.columns, ""],
    rows: panel.rows.map((row) => ({ ...row, cells: [...row.cells, ""] })),
  }))
}

export function removeTableColumn(
  week: WeekDocument,
  pageIndex: number,
  columnIndex: number
): WeekDocument {
  return updateTablePanel(week, pageIndex, (panel) => {
    if (panel.columns.length <= 1) {
      throw new Error("Table must keep at least one column")
    }

    return {
      ...panel,
      columns: panel.columns.filter((_, index) => index !== columnIndex),
      rows: panel.rows.map((row) => ({
        ...row,
        cells: row.cells.filter((_, index) => index !== columnIndex),
        emphasis: row.emphasis
          ?.filter((index) => index !== columnIndex)
          .map((index) => (index > columnIndex ? index - 1 : index)),
      })),
    }
  })
}

export function setChartPanelTitle(
  week: WeekDocument,
  pageIndex: number,
  title: string
): WeekDocument {
  return updateChartPanel(week, pageIndex, (panel) => ({
    ...panel,
    title,
  }))
}

export function setChartCategory(
  week: WeekDocument,
  pageIndex: number,
  categoryIndex: number,
  label: string
): WeekDocument {
  return updateChartPanel(week, pageIndex, (panel) => ({
    ...panel,
    categories: panel.categories.map((category, index) =>
      index === categoryIndex ? label : category
    ),
  }))
}

export function addChartCategory(
  week: WeekDocument,
  pageIndex: number
): WeekDocument {
  return updateChartPanel(week, pageIndex, (panel) => ({
    ...panel,
    categories: [...panel.categories, ""],
    series: panel.series.map((series) => ({
      ...series,
      values: [...series.values, 0],
    })),
  }))
}

export function removeChartCategory(
  week: WeekDocument,
  pageIndex: number,
  categoryIndex: number
): WeekDocument {
  return updateChartPanel(week, pageIndex, (panel) => ({
    ...panel,
    categories: panel.categories.filter((_, index) => index !== categoryIndex),
    series: panel.series.map((series) => ({
      ...series,
      values: series.values.filter((_, index) => index !== categoryIndex),
    })),
  }))
}

export function setChartSeriesName(
  week: WeekDocument,
  pageIndex: number,
  seriesIndex: number,
  name: string
): WeekDocument {
  return updateChartPanel(week, pageIndex, (panel) => ({
    ...panel,
    series: panel.series.map((series, index) =>
      index === seriesIndex ? { ...series, name } : series
    ),
  }))
}

export function setChartSeriesColor(
  week: WeekDocument,
  pageIndex: number,
  seriesIndex: number,
  color: string
): WeekDocument {
  return updateChartPanel(week, pageIndex, (panel) => ({
    ...panel,
    series: panel.series.map((series, index) =>
      index === seriesIndex
        ? { ...series, color: color === "" ? undefined : color }
        : series
    ),
  }))
}

export function setChartSeriesValue(
  week: WeekDocument,
  pageIndex: number,
  seriesIndex: number,
  categoryIndex: number,
  value: number
): WeekDocument {
  return updateChartPanel(week, pageIndex, (panel) => ({
    ...panel,
    series: panel.series.map((series, index) => {
      if (index !== seriesIndex) {
        return series
      }

      const values = [...series.values]
      values[categoryIndex] = Number.isFinite(value) ? value : 0

      return { ...series, values }
    }),
  }))
}

export function addChartSeries(
  week: WeekDocument,
  pageIndex: number
): WeekDocument {
  return updateChartPanel(week, pageIndex, (panel) => ({
    ...panel,
    series: [
      ...panel.series,
      {
        name: "",
        values: panel.categories.map(() => 0),
      },
    ],
  }))
}

export function removeChartSeries(
  week: WeekDocument,
  pageIndex: number,
  seriesIndex: number
): WeekDocument {
  return updateChartPanel(week, pageIndex, (panel) => ({
    ...panel,
    series: panel.series.filter((_, index) => index !== seriesIndex),
  }))
}

export function setFlowPanelTitle(
  week: WeekDocument,
  pageIndex: number,
  title: string
): WeekDocument {
  return updateFlowPanel(week, pageIndex, (panel) => ({
    ...panel,
    title,
  }))
}

export function setFlowStepLabel(
  week: WeekDocument,
  pageIndex: number,
  stepIndex: number,
  label: string
): WeekDocument {
  return updateFlowPanel(week, pageIndex, (panel) => ({
    ...panel,
    steps: panel.steps.map((step, index) =>
      index === stepIndex ? { ...step, label } : step
    ),
  }))
}

export function setFlowStepCaption(
  week: WeekDocument,
  pageIndex: number,
  stepIndex: number,
  caption: string
): WeekDocument {
  return updateFlowPanel(week, pageIndex, (panel) => ({
    ...panel,
    steps: panel.steps.map((step, index) =>
      index === stepIndex
        ? { ...step, caption: caption === "" ? undefined : caption }
        : step
    ),
  }))
}

export function setFlowStepVariant(
  week: WeekDocument,
  pageIndex: number,
  stepIndex: number,
  variant: "default" | "ok" | ""
): WeekDocument {
  return updateFlowPanel(week, pageIndex, (panel) => ({
    ...panel,
    steps: panel.steps.map((step, index) =>
      index === stepIndex
        ? {
            ...step,
            variant:
              variant === "default" || variant === "ok" ? variant : undefined,
          }
        : step
    ),
  }))
}

export function addFlowStep(
  week: WeekDocument,
  pageIndex: number
): WeekDocument {
  return updateFlowPanel(week, pageIndex, (panel) => ({
    ...panel,
    steps: [...panel.steps, { label: "" }],
  }))
}

export function removeFlowStep(
  week: WeekDocument,
  pageIndex: number,
  stepIndex: number
): WeekDocument {
  return updateFlowPanel(week, pageIndex, (panel) => ({
    ...panel,
    steps: panel.steps.filter((_, index) => index !== stepIndex),
  }))
}

export function moveFlowStep(
  week: WeekDocument,
  pageIndex: number,
  fromIndex: number,
  toIndex: number
): WeekDocument {
  return updateFlowPanel(week, pageIndex, (panel) => ({
    ...panel,
    steps: moveItems(panel.steps, fromIndex, toIndex),
  }))
}

export function setChecklistPanelTitle(
  week: WeekDocument,
  pageIndex: number,
  title: string
): WeekDocument {
  return updateChecklistPanel(week, pageIndex, (panel) => ({
    ...panel,
    title,
  }))
}

export function setChecklistItemLabel(
  week: WeekDocument,
  pageIndex: number,
  itemIndex: number,
  label: string
): WeekDocument {
  return updateChecklistPanel(week, pageIndex, (panel) => ({
    ...panel,
    items: panel.items.map((item, index) =>
      index === itemIndex ? { ...item, label } : item
    ),
  }))
}

export function setChecklistItemChecked(
  week: WeekDocument,
  pageIndex: number,
  itemIndex: number,
  checked: boolean
): WeekDocument {
  return updateChecklistPanel(week, pageIndex, (panel) => ({
    ...panel,
    items: panel.items.map((item, index) =>
      index === itemIndex
        ? { ...item, checked: checked ? true : undefined }
        : item
    ),
  }))
}

export function addChecklistItem(
  week: WeekDocument,
  pageIndex: number
): WeekDocument {
  return updateChecklistPanel(week, pageIndex, (panel) => ({
    ...panel,
    items: [...panel.items, { label: "", checked: false }],
  }))
}

export function removeChecklistItem(
  week: WeekDocument,
  pageIndex: number,
  itemIndex: number
): WeekDocument {
  return updateChecklistPanel(week, pageIndex, (panel) => ({
    ...panel,
    items: panel.items.filter((_, index) => index !== itemIndex),
  }))
}
