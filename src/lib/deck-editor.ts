import { moveEntry } from "@/lib/move-entry"
import { typedPageUpdater, updateDeckPage } from "@/lib/update-deck-page"
import {
  assertCanRemoveEntry,
  CARDINALITY,
  isFlowStepVariant,
  isFullWidthPanelPage,
  isHtmlPage,
  isEditorialFramePage,
  isTwoColumnPage,
} from "@/lib/deck"
import type {
  FlowStepVariant,
  EditablePanel,
  Deck,
  DeckTheme,
  FullWidthPanelPage,
  TwoColumnPage,
} from "@/lib/deck"

const updateTwoColumnPage = typedPageUpdater(
  isTwoColumnPage,
  "a two-column page"
)

const updateHtmlPage = typedPageUpdater(isHtmlPage, "an HTML page")
const updateEditorialPage = typedPageUpdater(
  isEditorialFramePage,
  "an Editorial Frame page"
)

type PanelOfKind<K extends EditablePanel["kind"]> = Extract<
  EditablePanel,
  { kind: K }
>

const updatePanelPage = typedPageUpdater(
  (page): page is TwoColumnPage | FullWidthPanelPage =>
    isTwoColumnPage(page) || isFullWidthPanelPage(page),
  "a page with an editable panel"
)

// 兩個持有 panel 的版型共用更新規則，避免相同表單產生不同資料行為。
function panelUpdater<K extends EditablePanel["kind"]>(kind: K) {
  return (
    deck: Deck,
    pageIndex: number,
    updater: (panel: PanelOfKind<K>) => PanelOfKind<K>
  ): Deck =>
    updatePanelPage(deck, pageIndex, (page) => {
      if (page.panel.kind !== kind) {
        throw new Error(`Page ${page.id} does not have a ${kind} panel`)
      }
      // 泛型 K 無法讓 TS 從 kind 比較收窄 union，上面的執行期檢查已保證型別
      return { ...page, panel: updater(page.panel as PanelOfKind<K>) }
    })
}

const updateTablePanel = panelUpdater("table")
const updateChartPanel = panelUpdater("chart")
const updateFlowPanel = panelUpdater("flow")
const updateChecklistPanel = panelUpdater("checklist")

// 選填文字只剩空白時視同未填，避免畫出空的頁尾或分隔線；保留原輸入讓打字中的尾端空白不被吃掉
function absentWhenBlank(text: string): string | undefined {
  return text.trim() === "" ? undefined : text
}

export function setPageTitle(
  deck: Deck,
  pageIndex: number,
  title: string
): Deck {
  return updateDeckPage(deck, pageIndex, (page) => ({ ...page, title }))
}

export function setPageHtmlFile(
  deck: Deck,
  pageIndex: number,
  htmlFile: string
): Deck {
  return updateHtmlPage(deck, pageIndex, (page) => ({ ...page, htmlFile }))
}

export function setPageItem(
  deck: Deck,
  pageIndex: number,
  itemIndex: number,
  field: "heading" | "body",
  value: string
): Deck {
  return updateTwoColumnPage(deck, pageIndex, (page) => ({
    ...page,
    items: page.items.map((item, index) =>
      index === itemIndex ? { ...item, [field]: value } : item
    ),
  }))
}

export function setPageBoundary(
  deck: Deck,
  pageIndex: number,
  boundary: string
): Deck {
  return updateEditorialPage(deck, pageIndex, (page) => ({
    ...page,
    boundary: absentWhenBlank(boundary),
  }))
}

export function setPageNotes(
  deck: Deck,
  pageIndex: number,
  notes: string
): Deck {
  return updateDeckPage(deck, pageIndex, (page) => ({
    ...page,
    notes: notes === "" ? undefined : notes,
  }))
}

export function setPageHidden(
  deck: Deck,
  pageIndex: number,
  hidden: boolean
): Deck {
  return updateDeckPage(deck, pageIndex, (page) => ({
    ...page,
    hidden: hidden ? true : undefined,
  }))
}

export function setDeckTheme(deck: Deck, theme: DeckTheme): Deck {
  return { ...deck, theme }
}

export function setDeckTitle(deck: Deck, title: string): Deck {
  return { ...deck, title: absentWhenBlank(title) }
}

export function setDeckShowPageNumbers(
  deck: Deck,
  showPageNumbers: boolean
): Deck {
  return {
    ...deck,
    showPageNumbers,
  }
}

export function setPageShowPageNumber(
  deck: Deck,
  pageIndex: number,
  showPageNumber: boolean | undefined
): Deck {
  return updateDeckPage(deck, pageIndex, (page) => ({
    ...page,
    showPageNumber,
  }))
}

export function setTablePanelTitle(
  deck: Deck,
  pageIndex: number,
  title: string
): Deck {
  return updateTablePanel(deck, pageIndex, (panel) => ({ ...panel, title }))
}

export function setTablePanelCell(
  deck: Deck,
  pageIndex: number,
  rowIndex: number,
  cellIndex: number,
  value: string
): Deck {
  return updateTablePanel(deck, pageIndex, (panel) => ({
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
  deck: Deck,
  pageIndex: number,
  columnIndex: number,
  value: string
): Deck {
  return updateTablePanel(deck, pageIndex, (panel) => ({
    ...panel,
    columns: panel.columns.map((column, index) =>
      index === columnIndex ? value : column
    ),
  }))
}

export function setTableReferenceColumn(
  deck: Deck,
  pageIndex: number,
  referenceColumn: number | undefined
): Deck {
  return updateTablePanel(deck, pageIndex, (panel) => ({
    ...panel,
    referenceColumn,
  }))
}

export function addTableRow(deck: Deck, pageIndex: number): Deck {
  return updateTablePanel(deck, pageIndex, (panel) => ({
    ...panel,
    rows: [...panel.rows, { cells: panel.columns.map(() => "") }],
  }))
}

export function removeTableRow(
  deck: Deck,
  pageIndex: number,
  rowIndex: number
): Deck {
  return updateTablePanel(deck, pageIndex, (panel) => {
    assertCanRemoveEntry(panel.rows, CARDINALITY.tableRows)

    return {
      ...panel,
      rows: panel.rows.filter((_, index) => index !== rowIndex),
    }
  })
}

export function addTableColumn(deck: Deck, pageIndex: number): Deck {
  return updateTablePanel(deck, pageIndex, (panel) => ({
    ...panel,
    columns: [...panel.columns, ""],
    rows: panel.rows.map((row) => ({ ...row, cells: [...row.cells, ""] })),
  }))
}

export function removeTableColumn(
  deck: Deck,
  pageIndex: number,
  columnIndex: number
): Deck {
  return updateTablePanel(deck, pageIndex, (panel) => {
    assertCanRemoveEntry(panel.columns, CARDINALITY.tableColumns)

    return {
      ...panel,
      columns: panel.columns.filter((_, index) => index !== columnIndex),
      referenceColumn:
        panel.referenceColumn === undefined ||
        panel.referenceColumn === columnIndex
          ? undefined
          : panel.referenceColumn > columnIndex
            ? panel.referenceColumn - 1
            : panel.referenceColumn,
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
  deck: Deck,
  pageIndex: number,
  title: string
): Deck {
  return updateChartPanel(deck, pageIndex, (panel) => ({
    ...panel,
    title,
  }))
}

export function setChartCategory(
  deck: Deck,
  pageIndex: number,
  categoryIndex: number,
  label: string
): Deck {
  return updateChartPanel(deck, pageIndex, (panel) => ({
    ...panel,
    categories: panel.categories.map((category, index) =>
      index === categoryIndex ? label : category
    ),
  }))
}

export function addChartCategory(deck: Deck, pageIndex: number): Deck {
  return updateChartPanel(deck, pageIndex, (panel) => ({
    ...panel,
    categories: [...panel.categories, ""],
    series: panel.series.map((series) => ({
      ...series,
      values: [...series.values, 0],
    })),
  }))
}

export function removeChartCategory(
  deck: Deck,
  pageIndex: number,
  categoryIndex: number
): Deck {
  return updateChartPanel(deck, pageIndex, (panel) => {
    assertCanRemoveEntry(panel.categories, CARDINALITY.chartCategories)
    return {
      ...panel,
      categories: panel.categories.filter(
        (_, index) => index !== categoryIndex
      ),
      series: panel.series.map((series) => ({
        ...series,
        values: series.values.filter((_, index) => index !== categoryIndex),
      })),
    }
  })
}

export function setChartSeriesName(
  deck: Deck,
  pageIndex: number,
  seriesIndex: number,
  name: string
): Deck {
  return updateChartPanel(deck, pageIndex, (panel) => ({
    ...panel,
    series: panel.series.map((series, index) =>
      index === seriesIndex ? { ...series, name } : series
    ),
  }))
}

export function setChartSeriesColor(
  deck: Deck,
  pageIndex: number,
  seriesIndex: number,
  color: string
): Deck {
  return updateChartPanel(deck, pageIndex, (panel) => ({
    ...panel,
    series: panel.series.map((series, index) =>
      index === seriesIndex
        ? { ...series, color: color === "" ? undefined : color }
        : series
    ),
  }))
}

export function setChartSeriesValue(
  deck: Deck,
  pageIndex: number,
  seriesIndex: number,
  categoryIndex: number,
  value: number
): Deck {
  return updateChartPanel(deck, pageIndex, (panel) => ({
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

export function addChartSeries(deck: Deck, pageIndex: number): Deck {
  return updateChartPanel(deck, pageIndex, (panel) => ({
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
  deck: Deck,
  pageIndex: number,
  seriesIndex: number
): Deck {
  return updateChartPanel(deck, pageIndex, (panel) => {
    assertCanRemoveEntry(panel.series, CARDINALITY.chartSeries)
    return {
      ...panel,
      series: panel.series.filter((_, index) => index !== seriesIndex),
    }
  })
}

export function setFlowPanelTitle(
  deck: Deck,
  pageIndex: number,
  title: string
): Deck {
  return updateFlowPanel(deck, pageIndex, (panel) => ({
    ...panel,
    title,
  }))
}

export function setFlowStepLabel(
  deck: Deck,
  pageIndex: number,
  stepIndex: number,
  label: string
): Deck {
  return updateFlowPanel(deck, pageIndex, (panel) => ({
    ...panel,
    steps: panel.steps.map((step, index) =>
      index === stepIndex ? { ...step, label } : step
    ),
  }))
}

export function setFlowStepCaption(
  deck: Deck,
  pageIndex: number,
  stepIndex: number,
  caption: string
): Deck {
  return updateFlowPanel(deck, pageIndex, (panel) => ({
    ...panel,
    steps: panel.steps.map((step, index) =>
      index === stepIndex
        ? { ...step, caption: caption === "" ? undefined : caption }
        : step
    ),
  }))
}

export function setFlowStepVariant(
  deck: Deck,
  pageIndex: number,
  stepIndex: number,
  variant: FlowStepVariant | ""
): Deck {
  return updateFlowPanel(deck, pageIndex, (panel) => ({
    ...panel,
    steps: panel.steps.map((step, index) =>
      index === stepIndex
        ? {
            ...step,
            variant: isFlowStepVariant(variant) ? variant : undefined,
          }
        : step
    ),
  }))
}

export function addFlowStep(deck: Deck, pageIndex: number): Deck {
  return updateFlowPanel(deck, pageIndex, (panel) => ({
    ...panel,
    steps: [...panel.steps, { label: "" }],
  }))
}

export function removeFlowStep(
  deck: Deck,
  pageIndex: number,
  stepIndex: number
): Deck {
  return updateFlowPanel(deck, pageIndex, (panel) => {
    assertCanRemoveEntry(panel.steps, CARDINALITY.flowSteps)
    return {
      ...panel,
      steps: panel.steps.filter((_, index) => index !== stepIndex),
    }
  })
}

export function moveFlowStep(
  deck: Deck,
  pageIndex: number,
  fromIndex: number,
  toIndex: number
): Deck {
  return updateFlowPanel(deck, pageIndex, (panel) => ({
    ...panel,
    steps: moveEntry(panel.steps, { from: fromIndex, to: toIndex }),
  }))
}

export function setChecklistPanelTitle(
  deck: Deck,
  pageIndex: number,
  title: string
): Deck {
  return updateChecklistPanel(deck, pageIndex, (panel) => ({
    ...panel,
    title,
  }))
}

export function setChecklistItemLabel(
  deck: Deck,
  pageIndex: number,
  itemIndex: number,
  label: string
): Deck {
  return updateChecklistPanel(deck, pageIndex, (panel) => ({
    ...panel,
    items: panel.items.map((item, index) =>
      index === itemIndex ? { ...item, label } : item
    ),
  }))
}

export function setChecklistItemChecked(
  deck: Deck,
  pageIndex: number,
  itemIndex: number,
  checked: boolean
): Deck {
  return updateChecklistPanel(deck, pageIndex, (panel) => ({
    ...panel,
    items: panel.items.map((item, index) =>
      index === itemIndex
        ? { ...item, checked: checked ? true : undefined }
        : item
    ),
  }))
}

export function addChecklistItem(deck: Deck, pageIndex: number): Deck {
  return updateChecklistPanel(deck, pageIndex, (panel) => ({
    ...panel,
    items: [...panel.items, { label: "", checked: false }],
  }))
}

export function removeChecklistItem(
  deck: Deck,
  pageIndex: number,
  itemIndex: number
): Deck {
  return updateChecklistPanel(deck, pageIndex, (panel) => {
    assertCanRemoveEntry(panel.items, CARDINALITY.checklistItems)
    return {
      ...panel,
      items: panel.items.filter((_, index) => index !== itemIndex),
    }
  })
}
