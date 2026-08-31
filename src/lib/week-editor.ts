import type {
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
