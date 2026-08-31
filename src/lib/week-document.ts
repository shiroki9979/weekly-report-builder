export type SlideItem = {
  heading: string
  body: string
}

export type TablePanelRow = {
  cells: string[]
  emphasis?: number[]
}

export type TablePanel = {
  kind: "table"
  title: string
  columns: string[]
  rows: TablePanelRow[]
}

export type ChartSeries = {
  name: string
  color?: string
  values: number[]
}

export type ChartPanel = {
  kind: "chart"
  title: string
  categories: string[]
  series: ChartSeries[]
}

export type FlowStep = {
  label: string
  caption?: string
  variant?: "default" | "ok"
}

export type FlowPanel = {
  kind: "flow"
  title: string
  steps: FlowStep[]
}

export type ChecklistItem = {
  label: string
  checked?: boolean
}

export type ChecklistPanel = {
  kind: "checklist"
  title: string
  items: ChecklistItem[]
}

/** Spec only; not rendered in v1 */
export type FieldsPanel = {
  kind: "fields"
  title: string
  rows: { label: string; value: string }[]
}

export type Panel =
  | TablePanel
  | ChartPanel
  | FlowPanel
  | ChecklistPanel
  | FieldsPanel

export type SlideLayout = "two-column" | (string & {})

export type WeekPage = {
  id: string
  layout: SlideLayout
  title: string
  items: SlideItem[]
  panel: Panel
  hidden?: boolean
  notes?: string
}

export type WeekDocument = {
  start: string
  end: string
  pages: WeekPage[]
}

const V1_PANEL_KINDS = new Set([
  "table",
  "chart",
  "flow",
  "checklist",
  "fields",
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid week document: ${field} must be a non-empty string`)
  }

  return value
}

function parseSlideItem(value: unknown, index: number): SlideItem {
  if (!isRecord(value)) {
    throw new Error(`Invalid week document: items[${index}] must be an object`)
  }

  return {
    heading: readString(value.heading, `items[${index}].heading`),
    body: readString(value.body, `items[${index}].body`),
  }
}

function parseTablePanel(value: Record<string, unknown>): TablePanel {
  const columns = value.columns
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new Error("Invalid week document: table panel requires columns")
  }

  const rows = value.rows
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Invalid week document: table panel requires rows")
  }

  return {
    kind: "table",
    title: readString(value.title, "panel.title"),
    columns: columns.map((column, index) =>
      readString(column, `panel.columns[${index}]`)
    ),
    rows: rows.map((row, rowIndex) => {
      if (!isRecord(row)) {
        throw new Error(`Invalid week document: panel.rows[${rowIndex}]`)
      }

      const cells = row.cells
      if (!Array.isArray(cells) || cells.length === 0) {
        throw new Error(`Invalid week document: panel.rows[${rowIndex}].cells`)
      }

      const emphasis = row.emphasis
      if (
        emphasis !== undefined &&
        (!Array.isArray(emphasis) ||
          emphasis.some((index) => typeof index !== "number"))
      ) {
        throw new Error(
          `Invalid week document: panel.rows[${rowIndex}].emphasis`
        )
      }

      return {
        cells: cells.map((cell, cellIndex) =>
          readString(cell, `panel.rows[${rowIndex}].cells[${cellIndex}]`)
        ),
        emphasis: emphasis as number[] | undefined,
      }
    }),
  }
}

function parsePanel(value: unknown): Panel {
  if (!isRecord(value)) {
    throw new Error("Invalid week document: panel must be an object")
  }

  const kind = readString(value.kind, "panel.kind")
  if (!V1_PANEL_KINDS.has(kind)) {
    throw new Error(`Invalid week document: unknown panel kind "${kind}"`)
  }

  switch (kind) {
    case "table":
      return parseTablePanel(value)
    case "chart":
      return {
        kind: "chart",
        title: readString(value.title, "panel.title"),
        categories: Array.isArray(value.categories)
          ? value.categories.map((category, index) =>
              readString(category, `panel.categories[${index}]`)
            )
          : [],
        series: Array.isArray(value.series)
          ? value.series.map((series, index) => {
              if (!isRecord(series)) {
                throw new Error(`Invalid week document: panel.series[${index}]`)
              }

              return {
                name: readString(series.name, `panel.series[${index}].name`),
                color:
                  typeof series.color === "string" ? series.color : undefined,
                values: Array.isArray(series.values)
                  ? series.values.map((entry) => Number(entry))
                  : [],
              }
            })
          : [],
      }
    case "flow":
      return {
        kind: "flow",
        title: readString(value.title, "panel.title"),
        steps: Array.isArray(value.steps)
          ? value.steps.map((step, index) => {
              if (!isRecord(step)) {
                throw new Error(`Invalid week document: panel.steps[${index}]`)
              }

              return {
                label: readString(step.label, `panel.steps[${index}].label`),
                caption:
                  typeof step.caption === "string" ? step.caption : undefined,
                variant:
                  step.variant === "ok" || step.variant === "default"
                    ? step.variant
                    : undefined,
              }
            })
          : [],
      }
    case "checklist":
      return {
        kind: "checklist",
        title: readString(value.title, "panel.title"),
        items: Array.isArray(value.items)
          ? value.items.map((item, index) => {
              if (!isRecord(item)) {
                throw new Error(`Invalid week document: panel.items[${index}]`)
              }

              return {
                label: readString(item.label, `panel.items[${index}].label`),
                checked:
                  typeof item.checked === "boolean" ? item.checked : undefined,
              }
            })
          : [],
      }
    case "fields":
      return {
        kind: "fields",
        title: readString(value.title, "panel.title"),
        rows: Array.isArray(value.rows)
          ? value.rows.map((row, index) => {
              if (!isRecord(row)) {
                throw new Error(`Invalid week document: panel.rows[${index}]`)
              }

              return {
                label: readString(row.label, `panel.rows[${index}].label`),
                value: readString(row.value, `panel.rows[${index}].value`),
              }
            })
          : [],
      }
    default:
      throw new Error(`Invalid week document: unknown panel kind "${kind}"`)
  }
}

function parseWeekPage(value: unknown, index: number): WeekPage {
  if (!isRecord(value)) {
    throw new Error(`Invalid week document: pages[${index}] must be an object`)
  }

  const items = value.items
  if (!Array.isArray(items) || items.length !== 3) {
    throw new Error(`Invalid week document: pages[${index}].items must have 3 entries`)
  }

  return {
    id: readString(value.id, `pages[${index}].id`),
    layout: readString(value.layout, `pages[${index}].layout`),
    title: readString(value.title, `pages[${index}].title`),
    items: items.map((item, itemIndex) => parseSlideItem(item, itemIndex)),
    panel: parsePanel(value.panel),
    hidden: typeof value.hidden === "boolean" ? value.hidden : undefined,
    notes: typeof value.notes === "string" ? value.notes : undefined,
  }
}

export function parseWeekDocument(value: unknown): WeekDocument {
  if (!isRecord(value)) {
    throw new Error("Invalid week document: root must be an object")
  }

  const pages = value.pages
  if (!Array.isArray(pages) || pages.length === 0) {
    throw new Error("Invalid week document: pages must be a non-empty array")
  }

  return {
    start: readString(value.start, "start"),
    end: readString(value.end, "end"),
    pages: pages.map((page, index) => parseWeekPage(page, index)),
  }
}

export const DEFAULT_WEEK_MONDAY = "2026-08-24"
