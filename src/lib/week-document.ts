import { validateHtmlFileName } from "./html-page"
import { isCalendarMonday, observationMonday } from "./trend-target"

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

/** 僅定義於規格，stage 尚未渲染 */
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
  | "trend-target"

/** 各版面共用的顯示與講稿欄位，避免每個 page type 各抄一次 */
export type WeekPageChrome = {
  hidden?: boolean
  notes?: string
  showPageNumber?: boolean
}

export type TwoColumnWeekPage = WeekPageChrome & {
  id: string
  layout: "two-column"
  title: string
  items: SlideItem[]
  panel: Panel
}

export type HtmlWeekPage = WeekPageChrome & {
  id: string
  layout: "html"
  title: string
  htmlFile: string
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

export type WeeklyOverviewPage = WeekPageChrome & {
  id: string
  layout: "weekly-overview"
  title: string
  lead: Outcome
  supporting: Outcome[]
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

export type EvidenceDecisionPage = WeekPageChrome & {
  id: string
  layout: "evidence-decision"
  title: string
  verdict: string
  metrics: ComparisonMetric[]
  interpretations: string[]
}

export type Commitment = {
  title: string
  outcome: string
  checkpoint: string
}

export type NextActionsPage = WeekPageChrome & {
  id: string
  layout: "next-actions"
  variant?: "columns" | "rows"
  title: string
  commitments: Commitment[]
}

export type TrendObservation =
  | { state: "measured"; value: number }
  | { state: "missing" }
  | { state: "unfilled" }

export type TrendTargetPage = WeekPageChrome & {
  id: string
  layout: "trend-target"
  title: string
  metric: Pick<
    ComparisonMetric,
    "label" | "unit" | "unitPosition" | "unitSpacing" | "precision"
  >
  startMonday: string | null
  observations: TrendObservation[]
  target: number | null
  direction: "at-most" | "at-least"
  interpretation: string
  measurementContext: string
}

export type UnknownWeekPage = WeekPageChrome & {
  id: string
  layout: string
  title: string
  [key: string]: unknown
}

export type StructuredWeekPage =
  | TwoColumnWeekPage
  | WeeklyOverviewPage
  | EvidenceDecisionPage
  | NextActionsPage
  | TrendTargetPage

export type WeekPage =
  | TwoColumnWeekPage
  | HtmlWeekPage
  | WeeklyOverviewPage
  | EvidenceDecisionPage
  | NextActionsPage
  | TrendTargetPage
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

export function isTrendTargetPage(page: WeekPage): page is TrendTargetPage {
  return page.layout === "trend-target" && "observations" in page
}

export function isStructuredWeekPage(
  page: WeekPage
): page is StructuredWeekPage {
  return (
    isTwoColumnWeekPage(page) ||
    isWeeklyOverviewPage(page) ||
    isEvidenceDecisionPage(page) ||
    isNextActionsPage(page) ||
    isTrendTargetPage(page)
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
    trendTarget: () => true,
    twoColumn: (twoColumn) =>
      SUPPORTED_TWO_COLUMN_PANEL_KINDS.has(twoColumn.panel.kind),
    unknown: () => false,
  })
}

const PAGE_NUMBER_LAYOUTS = new Set([
  "html",
  "weekly-overview",
  "evidence-decision",
  "next-actions",
  "trend-target",
])

/**
 * 單頁未覆寫時的頁碼可見性。HTML Page 的片段可能自帶頁碼，
 * 疊加 overlay 會改變既有輸出，所以不繼承週層級預設、須逐頁開啟。
 */
export function defaultPageNumberVisibility(
  week: WeekDocument,
  page: WeekPage
): boolean {
  if (isHtmlWeekPage(page)) {
    return false
  }
  return week.showPageNumbers ?? true
}

/**
 * 頁碼只畫在 Editorial 與 HTML。隱藏頁已有 Hidden 標記，不再疊一次。
 * 單頁設定優先於預設。
 */
export function isPageNumberVisible(
  week: WeekDocument,
  page: WeekPage
): boolean {
  if (page.hidden || !PAGE_NUMBER_LAYOUTS.has(page.layout)) {
    return false
  }
  return page.showPageNumber ?? defaultPageNumberVisibility(week, page)
}

type WeekPageMatchers<T> = {
  html: (page: HtmlWeekPage) => T
  twoColumn: (page: TwoColumnWeekPage) => T
  weeklyOverview: (page: WeeklyOverviewPage) => T
  evidenceDecision: (page: EvidenceDecisionPage) => T
  nextActions: (page: NextActionsPage) => T
  trendTarget: (page: TrendTargetPage) => T
  unknown: (page: WeekPage) => T
}

// 已解析頁面的 layout 分支只在這裡打開一次，preview／editor／clone／readiness 共用同一組 identity
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
  if (isTrendTargetPage(page)) {
    return matchers.trendTarget(page)
  }
  return matchers.unknown(page)
}

// owner／noun 讓錯誤訊息由規則本身產生，改上下限時文案與單複數跟著正確
// 省略 max 表示沒有上限，避免 Infinity 流進錯誤文案
export type Cardinality = {
  min: number
  max?: number
  owner: string
  noun: string
  plural?: string
}

// 數量規則的單一來源。版面規則由 parser、reducer 與表單共用；panel 規則只約束編輯，
// chart／flow／checklist 的 parser 容許空陣列，交由 readiness 標成 Draft Page
export const CARDINALITY = {
  supportingOutcomes: {
    min: 1,
    max: 3,
    owner: "Weekly Overview",
    noun: "supporting outcome",
  },
  comparisonMetrics: {
    min: 1,
    max: 2,
    owner: "Evidence-backed Decision",
    noun: "metric",
  },
  interpretations: {
    min: 1,
    max: 2,
    owner: "Evidence-backed Decision",
    noun: "interpretation",
  },
  commitments: { min: 2, max: 4, owner: "Next Actions", noun: "commitment" },
  trendObservations: {
    min: 2,
    max: 12,
    owner: "Trend & Target",
    noun: "observation",
  },
  twoColumnItems: { min: 3, max: 3, owner: "Two-column", noun: "item" },
  tableRows: { min: 1, owner: "Table", noun: "row" },
  tableColumns: { min: 1, owner: "Table", noun: "column" },
  chartCategories: {
    min: 1,
    owner: "Chart",
    noun: "category",
    plural: "categories",
  },
  chartSeries: {
    min: 1,
    owner: "Chart",
    noun: "series",
    plural: "series",
  },
  flowSteps: { min: 1, owner: "Flow", noun: "step" },
  checklistItems: { min: 1, owner: "Checklist", noun: "item" },
} as const satisfies Record<string, Cardinality>

export function canAddEntry(
  entries: readonly unknown[],
  rule: Cardinality
): boolean {
  return rule.max === undefined || entries.length < rule.max
}

export function canRemoveEntry(
  entries: readonly unknown[],
  rule: Cardinality
): boolean {
  return entries.length > rule.min
}

type Noun = Pick<Cardinality, "noun" | "plural">

function countOf(count: number, noun: Noun): string {
  const word = count === 1 ? noun.noun : (noun.plural ?? `${noun.noun}s`)
  return `${count} ${word}`
}

export function assertCanAddEntry(
  entries: readonly unknown[],
  rule: Cardinality
): void {
  if (rule.max !== undefined && !canAddEntry(entries, rule)) {
    throw new Error(`${rule.owner} can have at most ${countOf(rule.max, rule)}`)
  }
}

export function assertCanRemoveEntry(
  entries: readonly unknown[],
  rule: Cardinality
): void {
  if (!canRemoveEntry(entries, rule)) {
    throw new Error(
      `${rule.owner} must keep at least ${countOf(rule.min, rule)}`
    )
  }
}

export function isFiniteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0
}

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

function readArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid week document: ${field} must be an array`)
  }

  return value
}

function readNonEmptyArray(value: unknown, field: string): unknown[] {
  const entries = readArray(value, field)
  if (entries.length === 0) {
    throw new Error(`Invalid week document: ${field} must not be empty`)
  }

  return entries
}

function readNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid week document: ${field} must be a finite number`)
  }

  return value
}

function readRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Invalid week document: ${field} must be an object`)
  }

  return value
}

function parseTablePanel(value: Record<string, unknown>): TablePanel {
  const columns = readNonEmptyArray(value.columns, "panel.columns")
  const rows = readNonEmptyArray(value.rows, "panel.rows")

  return {
    kind: "table",
    title: readString(value.title, "panel.title"),
    columns: columns.map((column, index) =>
      readString(column, `panel.columns[${index}]`)
    ),
    rows: rows.map((entry, rowIndex) => {
      const field = `panel.rows[${rowIndex}]`
      const row = readRecord(entry, field)
      const cells = readNonEmptyArray(row.cells, `${field}.cells`)

      return {
        cells: cells.map((cell, cellIndex) =>
          readString(cell, `${field}.cells[${cellIndex}]`)
        ),
        emphasis:
          row.emphasis === undefined
            ? undefined
            : readArray(row.emphasis, `${field}.emphasis`).map((index, at) =>
                readNumber(index, `${field}.emphasis[${at}]`)
              ),
      }
    }),
  }
}

function parseChartPanel(value: Record<string, unknown>): ChartPanel {
  return {
    kind: "chart",
    title: readString(value.title, "panel.title"),
    categories: readArray(value.categories, "panel.categories").map(
      (category, index) => readString(category, `panel.categories[${index}]`)
    ),
    series: readArray(value.series, "panel.series").map((entry, index) => {
      const field = `panel.series[${index}]`
      const series = readRecord(entry, field)

      return {
        name: readString(series.name, `${field}.name`),
        color: typeof series.color === "string" ? series.color : undefined,
        values: readArray(series.values, `${field}.values`).map(
          (value, valueIndex) =>
            readNumber(value, `${field}.values[${valueIndex}]`)
        ),
      }
    }),
  }
}

function parseFlowPanel(value: Record<string, unknown>): FlowPanel {
  return {
    kind: "flow",
    title: readString(value.title, "panel.title"),
    steps: readArray(value.steps, "panel.steps").map((entry, index) => {
      const field = `panel.steps[${index}]`
      const step = readRecord(entry, field)

      return {
        label: readString(step.label, `${field}.label`),
        caption: typeof step.caption === "string" ? step.caption : undefined,
        variant:
          step.variant === "ok" || step.variant === "default"
            ? step.variant
            : undefined,
      }
    }),
  }
}

function parseChecklistPanel(value: Record<string, unknown>): ChecklistPanel {
  return {
    kind: "checklist",
    title: readString(value.title, "panel.title"),
    items: readArray(value.items, "panel.items").map((entry, index) => {
      const field = `panel.items[${index}]`
      const item = readRecord(entry, field)

      return {
        label: readString(item.label, `${field}.label`),
        checked: typeof item.checked === "boolean" ? item.checked : undefined,
      }
    }),
  }
}

function parseFieldsPanel(value: Record<string, unknown>): FieldsPanel {
  return {
    kind: "fields",
    title: readString(value.title, "panel.title"),
    rows: readArray(value.rows, "panel.rows").map((entry, index) => {
      const field = `panel.rows[${index}]`
      const row = readRecord(entry, field)

      return {
        label: readString(row.label, `${field}.label`),
        value: readString(row.value, `${field}.value`),
      }
    }),
  }
}

function parsePanel(value: unknown): Panel {
  const panel = readRecord(value, "panel")
  const kind = readNonEmptyString(panel.kind, "panel.kind")

  switch (kind) {
    case "table":
      return parseTablePanel(panel)
    case "chart":
      return parseChartPanel(panel)
    case "flow":
      return parseFlowPanel(panel)
    case "checklist":
      return parseChecklistPanel(panel)
    case "fields":
      return parseFieldsPanel(panel)
    default:
      throw new Error(`Invalid week document: unknown panel kind "${kind}"`)
  }
}

const STATUS_TONES = new Set<string>(["positive", "caution", "neutral"])

export function isStatusTone(value: string): value is StatusTone {
  return STATUS_TONES.has(value)
}

function parseStatusSignal(value: unknown, field: string): StatusSignal {
  if (!isRecord(value)) {
    throw new Error(`Invalid week document: ${field} must be an object`)
  }

  const tone = readNonEmptyString(value.tone, `${field}.tone`)
  if (!isStatusTone(tone)) {
    throw new Error(`Invalid week document: ${field}.tone`)
  }

  return {
    label: readString(value.label, `${field}.label`),
    tone,
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

type ParsedPageChrome = WeekPageChrome & {
  id: string
  title: string
}

// 保持既有 JSON 欄位順序（id、layout、title、版面內容、顯示欄位），存檔時不產生無意義 diff
function withChrome<L extends string, C extends object>(
  chrome: ParsedPageChrome,
  layout: L,
  content: C
): ParsedPageChrome & { layout: L } & C {
  return {
    id: chrome.id,
    layout,
    title: chrome.title,
    ...content,
    hidden: chrome.hidden,
    notes: chrome.notes,
    showPageNumber: chrome.showPageNumber,
  }
}

const ENTRY: Noun = { noun: "entry", plural: "entries" }

function entryRangeLabel(rule: Cardinality): string {
  if (rule.max === undefined) {
    return `at least ${countOf(rule.min, ENTRY)}`
  }
  if (rule.min === rule.max) {
    return countOf(rule.min, ENTRY)
  }
  return `${rule.min} to ${countOf(rule.max, ENTRY)}`
}

function readEntries(
  value: unknown,
  field: string,
  rule: Cardinality
): unknown[] {
  if (
    !Array.isArray(value) ||
    value.length < rule.min ||
    (rule.max !== undefined && value.length > rule.max)
  ) {
    throw new Error(
      `Invalid week document: ${field} must have ${entryRangeLabel(rule)}`
    )
  }

  return value
}

function parseWeeklyOverviewPage(
  value: Record<string, unknown>,
  chrome: ParsedPageChrome,
  field: string
): WeeklyOverviewPage {
  const supporting = readEntries(
    value.supporting,
    `${field}.supporting`,
    CARDINALITY.supportingOutcomes
  )

  return withChrome(chrome, "weekly-overview", {
    lead: parseOutcome(value.lead, `${field}.lead`),
    supporting: supporting.map((entry, supportingIndex) =>
      parseOutcome(entry, `${field}.supporting[${supportingIndex}]`)
    ),
  })
}

const UNIT_POSITIONS = new Set<UnitPosition>(["before", "after"])
const UNIT_SPACINGS = new Set<UnitSpacing>(["none", "space"])
const PRECISIONS = new Set<ComparisonMetric["precision"]>([0, 1, 2])

export function hasValidMetricFormat(
  metric: Pick<ComparisonMetric, "unitPosition" | "unitSpacing" | "precision">
): boolean {
  return (
    UNIT_POSITIONS.has(metric.unitPosition) &&
    UNIT_SPACINGS.has(metric.unitSpacing) &&
    PRECISIONS.has(metric.precision)
  )
}

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
  chrome: ParsedPageChrome,
  field: string
): EvidenceDecisionPage {
  const metrics = readEntries(
    value.metrics,
    `${field}.metrics`,
    CARDINALITY.comparisonMetrics
  )
  const interpretations = readEntries(
    value.interpretations,
    `${field}.interpretations`,
    CARDINALITY.interpretations
  )

  return withChrome(chrome, "evidence-decision", {
    verdict: readString(value.verdict, `${field}.verdict`),
    metrics: metrics.map((metric, metricIndex) =>
      parseComparisonMetric(metric, `${field}.metrics[${metricIndex}]`)
    ),
    interpretations: interpretations.map((entry, interpretationIndex) =>
      readString(entry, `${field}.interpretations[${interpretationIndex}]`)
    ),
  })
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
  chrome: ParsedPageChrome,
  field: string
): NextActionsPage {
  const commitments = readEntries(
    value.commitments,
    `${field}.commitments`,
    CARDINALITY.commitments
  )

  return withChrome(chrome, "next-actions", {
    variant: parseNextActionsVariant(value.variant, `${field}.variant`),
    commitments: commitments.map((commitment, commitmentIndex) =>
      parseCommitment(commitment, `${field}.commitments[${commitmentIndex}]`)
    ),
  })
}

// 缺欄位的舊文件維持 Columns，避免既有週報開啟後版型改變
function parseNextActionsVariant(
  value: unknown,
  field: string
): NonNullable<NextActionsPage["variant"]> {
  if (value === undefined) return "columns"
  if (value === "columns" || value === "rows") return value
  throw new Error(`Invalid week document: ${field} must be columns or rows`)
}

function parseTrendTargetPage(
  value: Record<string, unknown>,
  chrome: ParsedPageChrome,
  field: string
): TrendTargetPage {
  const startMonday = parseStartMonday(value.startMonday, field)
  const observations = parseTrendObservations(value.observations, field)
  assertTrendDating({ startMonday, observations }, field)
  return withChrome(chrome, "trend-target", {
    metric: parseTrendMetric(value.metric, `${field}.metric`),
    startMonday,
    observations,
    target:
      value.target === null
        ? null
        : readNumber(value.target, `${field}.target`),
    direction: parseTrendDirection(value.direction, `${field}.direction`),
    interpretation: readString(value.interpretation, `${field}.interpretation`),
    measurementContext: readString(
      value.measurementContext,
      `${field}.measurementContext`
    ),
  })
}

function parseTrendMetric(
  value: unknown,
  field: string
): TrendTargetPage["metric"] {
  const metric = readRecord(value, field)
  const unitPosition = readNonEmptyString(
    metric.unitPosition,
    `${field}.unitPosition`
  )
  const unitSpacing = readNonEmptyString(
    metric.unitSpacing,
    `${field}.unitSpacing`
  )
  const precision = metric.precision
  if (!UNIT_POSITIONS.has(unitPosition as UnitPosition))
    throw new Error(`Invalid week document: ${field}.unitPosition`)
  if (!UNIT_SPACINGS.has(unitSpacing as UnitSpacing))
    throw new Error(`Invalid week document: ${field}.unitSpacing`)
  if (
    typeof precision !== "number" ||
    !PRECISIONS.has(precision as ComparisonMetric["precision"])
  )
    throw new Error(`Invalid week document: ${field}.precision`)
  return {
    label: readString(metric.label, `${field}.label`),
    unit: readString(metric.unit, `${field}.unit`),
    unitPosition: unitPosition as UnitPosition,
    unitSpacing: unitSpacing as UnitSpacing,
    precision: precision as ComparisonMetric["precision"],
  }
}

function parseTrendDirection(
  value: unknown,
  field: string
): TrendTargetPage["direction"] {
  const direction = readNonEmptyString(value, field)
  if (direction !== "at-most" && direction !== "at-least")
    throw new Error(`Invalid week document: ${field}`)
  return direction
}

function parseStartMonday(value: unknown, field: string): string | null {
  if (value === null) return null
  if (typeof value !== "string" || !isCalendarMonday(value))
    throw new Error(
      `Invalid week document: ${field}.startMonday must be a Monday`
    )
  return value
}

function parseTrendObservations(
  value: unknown,
  field: string
): TrendObservation[] {
  const entries = readEntries(
    value,
    `${field}.observations`,
    CARDINALITY.trendObservations
  )
  return entries.map((entry, index) =>
    parseTrendObservation(entry, `${field}.observations[${index}]`)
  )
}

function parseTrendObservation(value: unknown, path: string): TrendObservation {
  const observation = readRecord(value, path)
  if (observation.state === "measured")
    return {
      state: "measured",
      value: readNumber(observation.value, `${path}.value`),
    }
  // 缺測與未填不得帶 value，否則讀者無法分辨殘值是否仍代表量測結果
  if (
    (observation.state === "missing" || observation.state === "unfilled") &&
    !Object.hasOwn(observation, "value")
  )
    return { state: observation.state }
  throw new Error(`Invalid week document: ${path}`)
}

function assertTrendDating(
  {
    startMonday,
    observations,
  }: Pick<TrendTargetPage, "startMonday" | "observations">,
  field: string
): void {
  if (startMonday === null) {
    if (observations.some((entry) => entry.state !== "unfilled"))
      throw new Error(
        `Invalid week document: ${field}.startMonday is required for entered observations`
      )
    return
  }
  try {
    observationMonday(startMonday, observations.length - 1)
  } catch (cause) {
    throw new Error(
      `Invalid week document: ${field}.observations exceed supported ISO dates`,
      { cause }
    )
  }
}

function parseHtmlPage(
  value: Record<string, unknown>,
  chrome: ParsedPageChrome,
  field: string
): HtmlWeekPage {
  const htmlFile = readNonEmptyString(value.htmlFile, `${field}.htmlFile`)

  try {
    validateHtmlFileName(htmlFile)
  } catch (cause: unknown) {
    const message = cause instanceof Error ? cause.message : "Invalid htmlFile"
    throw new Error(`Invalid week document: ${field}.htmlFile: ${message}`, {
      cause,
    })
  }

  return withChrome(chrome, "html", { htmlFile })
}

function parseTwoColumnPage(
  value: Record<string, unknown>,
  chrome: ParsedPageChrome,
  field: string
): TwoColumnWeekPage {
  const items = readEntries(
    value.items,
    `${field}.items`,
    CARDINALITY.twoColumnItems
  )

  return withChrome(chrome, "two-column", {
    items: items.map((item, itemIndex) => parseSlideItem(item, itemIndex)),
    panel: parsePanel(value.panel),
  })
}

type PageParser = (
  value: Record<string, unknown>,
  chrome: ParsedPageChrome,
  field: string
) => WeekPage

// parser 面對的是未驗證 JSON，無法走 matchWeekPage；以 layout 表格分派，新增版面只改這裡
const PAGE_PARSERS: Record<SlideLayout, PageParser> = {
  html: parseHtmlPage,
  "two-column": parseTwoColumnPage,
  "weekly-overview": parseWeeklyOverviewPage,
  "evidence-decision": parseEvidenceDecisionPage,
  "next-actions": parseNextActionsPage,
  "trend-target": parseTrendTargetPage,
}

function isKnownLayout(layout: string): layout is SlideLayout {
  return Object.hasOwn(PAGE_PARSERS, layout)
}

function parsePageChrome(
  value: Record<string, unknown>,
  field: string
): ParsedPageChrome {
  return {
    id: readNonEmptyString(value.id, `${field}.id`),
    title: readString(value.title, `${field}.title`),
    hidden: typeof value.hidden === "boolean" ? value.hidden : undefined,
    notes: typeof value.notes === "string" ? value.notes : undefined,
    showPageNumber:
      typeof value.showPageNumber === "boolean"
        ? value.showPageNumber
        : undefined,
  }
}

function parseWeekPage(value: unknown, index: number): WeekPage {
  const field = `pages[${index}]`
  const page = readRecord(value, field)
  const chrome = parsePageChrome(page, field)
  const layout = readNonEmptyString(page.layout, `${field}.layout`)

  if (!isKnownLayout(layout)) {
    // 保留未知版面讓 stage 顯示警告並略過匯出，而不是整份週報讀不進來
    return { ...page, ...withChrome(chrome, layout, {}) }
  }

  return PAGE_PARSERS[layout](page, chrome, field)
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
