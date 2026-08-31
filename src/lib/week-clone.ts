import type { Panel, WeekDocument, WeekPage } from "./week-document"

const MONDAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function parseMonday(value: string): Date {
  if (!MONDAY_PATTERN.test(value)) {
    throw new Error(`Invalid date: ${value}`)
  }

  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`)
  }

  return date
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

export function isMondayDate(value: string): boolean {
  return parseMonday(value).getUTCDay() === 1
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

function clearPage(page: WeekPage): WeekPage {
  return {
    id: page.id,
    layout: page.layout,
    title: "",
    items: page.items.map(() => ({ heading: "", body: "" })),
    panel: clearPanel(page.panel),
    hidden: page.hidden,
    notes: undefined,
  }
}

export function cloneWeekFromPrevious(
  previous: WeekDocument,
  targetMonday: string
): WeekDocument {
  if (!isMondayDate(targetMonday)) {
    throw new Error(`Week file name must be a Monday date: ${targetMonday}`)
  }

  const range = weekRangeForMonday(targetMonday)

  return {
    start: range.start,
    end: range.end,
    pages: previous.pages.map(clearPage),
  }
}
