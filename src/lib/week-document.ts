import { validateHtmlFileName } from "./html-page"

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
  TablePanel | ChartPanel | FlowPanel | ChecklistPanel | FieldsPanel

export type SlideLayout =
  | "two-column"
  | "html"
  | "weekly-overview"
  | "evidence-decision"
  | "next-actions"

export type TwoColumnWeekPage = {
  id: string
  layout: "two-column"
  title: string
  items: SlideItem[]
  panel: Panel
  hidden?: boolean
  notes?: string
  showPageNumber?: boolean
}

export type HtmlWeekPage = {
  id: string
  layout: "html"
  title: string
  htmlFile: string
  hidden?: boolean
  notes?: string
  showPageNumber?: boolean
}

export type StatusTone = "positive" | "caution" | "neutral"

export type StatusSignal = {
  label: string
  tone: StatusTone
}

export type Outcome = {
  workstream: string
  figure: string
  result: string
  impact: string
  status: StatusSignal
}

export type WeeklyOverviewPage = {
  id: string
  layout: "weekly-overview"
  title: string
  lead: Outcome
  supporting: Outcome[]
  hidden?: boolean
  notes?: string
  showPageNumber?: boolean
}

export type UnitPosition = "before" | "after"
export type UnitSpacing = "none" | "space"

export type ComparisonMetric = {
  label: string
  baselineValue: number | null
  candidateValue: number | null
  unit: string
  unitPosition: UnitPosition
  unitSpacing: UnitSpacing
  precision: 0 | 1 | 2
}

export type EvidenceDecisionPage = {
  id: string
  layout: "evidence-decision"
  title: string
  verdict: string
  metrics: ComparisonMetric[]
  interpretations: string[]
  hidden?: boolean
  notes?: string
  showPageNumber?: boolean
}

export type Commitment = {
  title: string
  outcome: string
  checkpoint: string
}

export type NextActionsPage = {
  id: string
  layout: "next-actions"
  title: string
  commitments: Commitment[]
  hidden?: boolean
  notes?: string
  showPageNumber?: boolean
}

export type UnknownWeekPage = {
  id: string
  layout: string
  title: string
  hidden?: boolean
  notes?: string
  showPageNumber?: boolean
  [key: string]: unknown
}

export type StructuredWeekPage =
  | TwoColumnWeekPage
  | WeeklyOverviewPage
  | EvidenceDecisionPage
  | NextActionsPage

export type WeekPage =
  | TwoColumnWeekPage
  | HtmlWeekPage
  | WeeklyOverviewPage
  | EvidenceDecisionPage
  | NextActionsPage
  | UnknownWeekPage

export type WeekDocument = {
  start: string
  end: string
  showPageNumbers?: boolean
  pages: WeekPage[]
}

export function isHtmlWeekPage(page: WeekPage): page is HtmlWeekPage {
  return page.layout === "html" && "htmlFile" in page
}

export function isTwoColumnWeekPage(page: WeekPage): page is TwoColumnWeekPage {
  return page.layout === "two-column" && "items" in page && "panel" in page
}

export function isWeeklyOverviewPage(
  page: WeekPage
): page is WeeklyOverviewPage {
  return (
    page.layout === "weekly-overview" && "lead" in page && "supporting" in page
  )
}

export function isEvidenceDecisionPage(
  page: WeekPage
): page is EvidenceDecisionPage {
  return (
    page.layout === "evidence-decision" &&
    "verdict" in page &&
    "metrics" in page &&
    "interpretations" in page
  )
}

export function isNextActionsPage(page: WeekPage): page is NextActionsPage {
  return page.layout === "next-actions" && "commitments" in page
}

export function isStructuredWeekPage(
  page: WeekPage
): page is StructuredWeekPage {
  return (
    isTwoColumnWeekPage(page) ||
    isWeeklyOverviewPage(page) ||
    isEvidenceDecisionPage(page) ||
    isNextActionsPage(page)
  )
}

const SUPPORTED_TWO_COLUMN_PANEL_KINDS = new Set([
  "table",
  "chart",
  "flow",
  "checklist",
])

export function isSupportedStagePage(page: WeekPage): boolean {
  return matchWeekPage(page, {
    html: () => true,
    weeklyOverview: () => true,
    evidenceDecision: () => true,
    nextActions: () => true,
    twoColumn: (twoColumn) =>
      SUPPORTED_TWO_COLUMN_PANEL_KINDS.has(twoColumn.panel.kind),
    unknown: () => false,
  })
}

/** 頁碼顯示判斷：單頁設定優先於週層級預設，無設定時預設顯示 */
export function isPageNumberVisible(
  week: WeekDocument,
  page: WeekPage
): boolean {
  if (page.showPageNumber !== undefined) {
    return page.showPageNumber
  }
  return week.showPageNumbers ?? true
}

type WeekPageMatchers<T> = {
  html: (page: HtmlWeekPage) => T
  twoColumn: (page: TwoColumnWeekPage) => T
  weeklyOverview: (page: WeeklyOverviewPage) => T
  evidenceDecision: (page: EvidenceDecisionPage) => T
  nextActions: (page: NextActionsPage) => T
  unknown: (page: WeekPage) => T
}

// 各 layout 的分支只在這裡打開一次，preview／editor／clone／readiness 共用同一組 identity
export function matchWeekPage<T>(
  page: WeekPage,
  matchers: WeekPageMatchers<T>
): T {
  if (isHtmlWeekPage(page)) {
    return matchers.html(page)
  }
  if (isTwoColumnWeekPage(page)) {
    return matchers.twoColumn(page)
  }
  if (isWeeklyOverviewPage(page)) {
    return matchers.weeklyOverview(page)
  }
  if (isEvidenceDecisionPage(page)) {
    return matchers.evidenceDecision(page)
  }
  if (isNextActionsPage(page)) {
    return matchers.nextActions(page)
  }
  return matchers.unknown(page)
}

export function isFiniteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0
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
  if (typeof value !== "string") {
    throw new Error(`Invalid week document: ${field} must be a string`)
  }

  return value
}

function readNonEmptyString(value: unknown, field: string): string {
  const text = readString(value, field)
  if (text.trim() === "") {
    throw new Error(
      `Invalid week document: ${field} must be a non-empty string`
    )
  }

  return text
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

  const kind = readNonEmptyString(value.kind, "panel.kind")
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

const STATUS_TONES = new Set<StatusTone>(["positive", "caution", "neutral"])

function parseStatusSignal(value: unknown, field: string): StatusSignal {
  if (!isRecord(value)) {
    throw new Error(`Invalid week document: ${field} must be an object`)
  }

  const tone = readNonEmptyString(value.tone, `${field}.tone`)
  if (!STATUS_TONES.has(tone as StatusTone)) {
    throw new Error(`Invalid week document: ${field}.tone`)
  }

  return {
    label: readString(value.label, `${field}.label`),
    tone: tone as StatusTone,
  }
}

function parseOutcome(value: unknown, field: string): Outcome {
  if (!isRecord(value)) {
    throw new Error(`Invalid week document: ${field} must be an object`)
  }

  return {
    workstream: readString(value.workstream, `${field}.workstream`),
    figure: readString(value.figure, `${field}.figure`),
    result: readString(value.result, `${field}.result`),
    impact: readString(value.impact, `${field}.impact`),
    status: parseStatusSignal(value.status, `${field}.status`),
  }
}

function parseWeeklyOverviewPage(
  value: Record<string, unknown>,
  common: {
    id: string
    title: string
    hidden?: boolean
    notes?: string
    showPageNumber?: boolean
  },
  index: number
): WeeklyOverviewPage {
  const supporting = value.supporting
  if (
    !Array.isArray(supporting) ||
    supporting.length < 1 ||
    supporting.length > 3
  ) {
    throw new Error(
      `Invalid week document: pages[${index}].supporting must have 1 to 3 entries`
    )
  }

  return {
    id: common.id,
    layout: "weekly-overview",
    title: common.title,
    lead: parseOutcome(value.lead, `pages[${index}].lead`),
    supporting: supporting.map((entry, supportingIndex) =>
      parseOutcome(entry, `pages[${index}].supporting[${supportingIndex}]`)
    ),
    hidden: common.hidden,
    notes: common.notes,
    showPageNumber: common.showPageNumber,
  }
}

const UNIT_POSITIONS = new Set<UnitPosition>(["before", "after"])
const UNIT_SPACINGS = new Set<UnitSpacing>(["none", "space"])
const PRECISIONS = new Set<ComparisonMetric["precision"]>([0, 1, 2])

function parseNullableMetricValue(
  value: unknown,
  field: string
): number | null {
  if (value === null) {
    return null
  }
  if (typeof value !== "number" || !isFiniteNonNegative(value)) {
    throw new Error(`Invalid week document: ${field}`)
  }
  return value
}

function parseComparisonMetric(
  value: unknown,
  field: string
): ComparisonMetric {
  if (!isRecord(value)) {
    throw new Error(`Invalid week document: ${field} must be an object`)
  }

  const unitPosition = readNonEmptyString(
    value.unitPosition,
    `${field}.unitPosition`
  )
  if (!UNIT_POSITIONS.has(unitPosition as UnitPosition)) {
    throw new Error(`Invalid week document: ${field}.unitPosition`)
  }

  const unitSpacing = readNonEmptyString(
    value.unitSpacing,
    `${field}.unitSpacing`
  )
  if (!UNIT_SPACINGS.has(unitSpacing as UnitSpacing)) {
    throw new Error(`Invalid week document: ${field}.unitSpacing`)
  }

  if (
    typeof value.precision !== "number" ||
    !PRECISIONS.has(value.precision as ComparisonMetric["precision"])
  ) {
    throw new Error(`Invalid week document: ${field}.precision`)
  }

  return {
    label: readString(value.label, `${field}.label`),
    baselineValue: parseNullableMetricValue(
      value.baselineValue,
      `${field}.baselineValue`
    ),
    candidateValue: parseNullableMetricValue(
      value.candidateValue,
      `${field}.candidateValue`
    ),
    unit: readString(value.unit, `${field}.unit`),
    unitPosition: unitPosition as UnitPosition,
    unitSpacing: unitSpacing as UnitSpacing,
    precision: value.precision as ComparisonMetric["precision"],
  }
}

function parseEvidenceDecisionPage(
  value: Record<string, unknown>,
  common: {
    id: string
    title: string
    hidden?: boolean
    notes?: string
    showPageNumber?: boolean
  },
  index: number
): EvidenceDecisionPage {
  const metrics = value.metrics
  if (!Array.isArray(metrics) || metrics.length < 1 || metrics.length > 2) {
    throw new Error(
      `Invalid week document: pages[${index}].metrics must have 1 to 2 entries`
    )
  }

  const interpretations = value.interpretations
  if (
    !Array.isArray(interpretations) ||
    interpretations.length < 1 ||
    interpretations.length > 2
  ) {
    throw new Error(
      `Invalid week document: pages[${index}].interpretations must have 1 to 2 entries`
    )
  }

  return {
    id: common.id,
    layout: "evidence-decision",
    title: common.title,
    verdict: readString(value.verdict, `pages[${index}].verdict`),
    metrics: metrics.map((metric, metricIndex) =>
      parseComparisonMetric(metric, `pages[${index}].metrics[${metricIndex}]`)
    ),
    interpretations: interpretations.map((entry, interpretationIndex) =>
      readString(
        entry,
        `pages[${index}].interpretations[${interpretationIndex}]`
      )
    ),
    hidden: common.hidden,
    notes: common.notes,
    showPageNumber: common.showPageNumber,
  }
}

function parseCommitment(value: unknown, field: string): Commitment {
  if (!isRecord(value)) {
    throw new Error(`Invalid week document: ${field} must be an object`)
  }

  return {
    title: readString(value.title, `${field}.title`),
    outcome: readString(value.outcome, `${field}.outcome`),
    checkpoint: readString(value.checkpoint, `${field}.checkpoint`),
  }
}

function parseNextActionsPage(
  value: Record<string, unknown>,
  common: {
    id: string
    title: string
    hidden?: boolean
    notes?: string
    showPageNumber?: boolean
  },
  index: number
): NextActionsPage {
  const commitments = value.commitments
  if (
    !Array.isArray(commitments) ||
    commitments.length < 2 ||
    commitments.length > 4
  ) {
    throw new Error(
      `Invalid week document: pages[${index}].commitments must have 2 to 4 entries`
    )
  }

  return {
    id: common.id,
    layout: "next-actions",
    title: common.title,
    commitments: commitments.map((commitment, commitmentIndex) =>
      parseCommitment(
        commitment,
        `pages[${index}].commitments[${commitmentIndex}]`
      )
    ),
    hidden: common.hidden,
    notes: common.notes,
    showPageNumber: common.showPageNumber,
  }
}

function parseWeekPage(value: unknown, index: number): WeekPage {
  if (!isRecord(value)) {
    throw new Error(`Invalid week document: pages[${index}] must be an object`)
  }

  const id = readNonEmptyString(value.id, `pages[${index}].id`)
  const layout = readNonEmptyString(value.layout, `pages[${index}].layout`)
  const title = readString(value.title, `pages[${index}].title`)
  const hidden = typeof value.hidden === "boolean" ? value.hidden : undefined
  const notes = typeof value.notes === "string" ? value.notes : undefined
  const showPageNumber =
    typeof value.showPageNumber === "boolean" ? value.showPageNumber : undefined

  if (layout === "html") {
    const htmlFile = readNonEmptyString(
      value.htmlFile,
      `pages[${index}].htmlFile`
    )

    try {
      validateHtmlFileName(htmlFile)
    } catch (cause: unknown) {
      const message =
        cause instanceof Error ? cause.message : "Invalid htmlFile"
      throw new Error(
        `Invalid week document: pages[${index}].htmlFile: ${message}`,
        { cause }
      )
    }

    return {
      id,
      layout: "html",
      title,
      htmlFile,
      hidden,
      notes,
      showPageNumber,
    }
  }

  if (layout === "weekly-overview") {
    return parseWeeklyOverviewPage(
      value,
      { id, title, hidden, notes, showPageNumber },
      index
    )
  }

  if (layout === "evidence-decision") {
    return parseEvidenceDecisionPage(
      value,
      { id, title, hidden, notes, showPageNumber },
      index
    )
  }

  if (layout === "next-actions") {
    return parseNextActionsPage(
      value,
      { id, title, hidden, notes, showPageNumber },
      index
    )
  }

  if (layout !== "two-column") {
    return { ...value, id, layout, title, hidden, notes, showPageNumber }
  }

  const items = value.items
  if (!Array.isArray(items) || items.length !== 3) {
    throw new Error(
      `Invalid week document: pages[${index}].items must have 3 entries`
    )
  }

  return {
    id,
    layout: "two-column",
    title,
    items: items.map((item, itemIndex) => parseSlideItem(item, itemIndex)),
    panel: parsePanel(value.panel),
    hidden,
    notes,
    showPageNumber,
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

  const parsedPages = pages.map((page, index) => parseWeekPage(page, index))
  const seenIds = new Set<string>()
  for (const page of parsedPages) {
    if (seenIds.has(page.id)) {
      throw new Error(
        `Invalid week document: page id "${page.id}" is not unique`
      )
    }
    seenIds.add(page.id)
  }

  const showPageNumbers =
    typeof value.showPageNumbers === "boolean"
      ? value.showPageNumbers
      : undefined

  return {
    start: readNonEmptyString(value.start, "start"),
    end: readNonEmptyString(value.end, "end"),
    ...(showPageNumbers !== undefined ? { showPageNumbers } : {}),
    pages: parsedPages,
  }
}
