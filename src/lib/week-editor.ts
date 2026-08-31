import type {
  ChartPanel,
  TablePanel,
  WeekDocument,
  WeekPage,
} from "@/lib/week-document"

function cloneWeek(week: WeekDocument): WeekDocument {
  return structuredClone(week)
}

function updatePage(
  week: WeekDocument,
  pageIndex: number,
  updater: (page: WeekPage) => WeekPage
): WeekDocument {
  const next = cloneWeek(week)
  const page = next.pages[pageIndex]

  if (!page) {
    throw new Error(`Page index out of range: ${pageIndex}`)
  }

  next.pages[pageIndex] = updater(page)
  return next
}

function requireTablePanel(page: WeekPage, pageIndex: number): TablePanel {
  if (page.panel.kind !== "table") {
    throw new Error(`Page ${pageIndex} does not have a table panel`)
  }

  return page.panel
}

function requireChartPanel(page: WeekPage, pageIndex: number): ChartPanel {
  if (page.panel.kind !== "chart") {
    throw new Error(`Page ${pageIndex} does not have a chart panel`)
  }

  return page.panel
}

function updateChartPanel(
  week: WeekDocument,
  pageIndex: number,
  updater: (panel: ChartPanel) => ChartPanel
): WeekDocument {
  return updatePage(week, pageIndex, (page) => ({
    ...page,
    panel: updater(requireChartPanel(page, pageIndex)),
  }))
}

export function setPageTitle(
  week: WeekDocument,
  pageIndex: number,
  title: string
): WeekDocument {
  return updatePage(week, pageIndex, (page) => ({ ...page, title }))
}

export function setPageItem(
  week: WeekDocument,
  pageIndex: number,
  itemIndex: number,
  field: "heading" | "body",
  value: string
): WeekDocument {
  return updatePage(week, pageIndex, (page) => {
    const items = page.items.map((item, index) =>
      index === itemIndex ? { ...item, [field]: value } : item
    )

    return { ...page, items }
  })
}

export function setPageNotes(
  week: WeekDocument,
  pageIndex: number,
  notes: string
): WeekDocument {
  return updatePage(week, pageIndex, (page) => ({
    ...page,
    notes: notes === "" ? undefined : notes,
  }))
}

export function setPageHidden(
  week: WeekDocument,
  pageIndex: number,
  hidden: boolean
): WeekDocument {
  return updatePage(week, pageIndex, (page) => ({
    ...page,
    hidden: hidden ? true : undefined,
  }))
}

export function setTablePanelTitle(
  week: WeekDocument,
  pageIndex: number,
  title: string
): WeekDocument {
  return updatePage(week, pageIndex, (page) => {
    const panel = requireTablePanel(page, pageIndex)

    return {
      ...page,
      panel: {
        ...panel,
        title,
      },
    }
  })
}

export function setTablePanelCell(
  week: WeekDocument,
  pageIndex: number,
  rowIndex: number,
  cellIndex: number,
  value: string
): WeekDocument {
  return updatePage(week, pageIndex, (page) => {
    const panel = requireTablePanel(page, pageIndex)
    const rows = panel.rows.map((row, index) => {
      if (index !== rowIndex) {
        return row
      }

      const cells = row.cells.map((cell, columnIndex) =>
        columnIndex === cellIndex ? value : cell
      )

      return { ...row, cells }
    })

    return {
      ...page,
      panel: {
        ...panel,
        rows,
      },
    }
  })
}

export function setTablePanelColumn(
  week: WeekDocument,
  pageIndex: number,
  columnIndex: number,
  value: string
): WeekDocument {
  return updatePage(week, pageIndex, (page) => {
    const panel = requireTablePanel(page, pageIndex)
    const columns = panel.columns.map((column, index) =>
      index === columnIndex ? value : column
    )

    return {
      ...page,
      panel: {
        ...panel,
        columns,
      },
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
