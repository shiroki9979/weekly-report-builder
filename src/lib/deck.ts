import { validateHtmlFileName } from "./html-page"
import {
  isTrendCadence,
  isTrendDirection,
  trendDatingError,
} from "./trend-target"

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

// parser 與編輯器共用這份清單判斷 flow step 樣式，不另列字串
export const FLOW_STEP_VARIANTS = ["default", "ok"] as const

export type FlowStepVariant = (typeof FLOW_STEP_VARIANTS)[number]

export function isFlowStepVariant(value: unknown): value is FlowStepVariant {
  return (FLOW_STEP_VARIANTS as readonly unknown[]).includes(value)
}

export type FlowStep = {
  label: string
  caption?: string
  variant?: FlowStepVariant
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
  | "overview"
  | "evidence-decision"
  | "next-actions"
  | "trend-target"

/** 各版面共用的顯示與講稿欄位，避免每個 page type 各抄一次 */
export type PageChrome = {
  hidden?: boolean
  notes?: string
  showPageNumber?: boolean
}

export type TwoColumnPage = PageChrome & {
  id: string
  layout: "two-column"
  title: string
  items: SlideItem[]
  panel: Panel
}

export type HtmlPage = PageChrome & {
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

export type OverviewPage = PageChrome & {
  id: string
  layout: "overview"
  title: string
  lead: Outcome
  supporting: Outcome[]
}

// 單位格式的合法值只在此列出一次：parser、readiness 與編輯器選項都由這些清單推導
export const UNIT_POSITIONS = ["after", "before"] as const
export const UNIT_SPACINGS = ["space", "none"] as const
export const METRIC_PRECISIONS = [0, 1, 2] as const

export type UnitPosition = (typeof UNIT_POSITIONS)[number]
export type UnitSpacing = (typeof UNIT_SPACINGS)[number]
export type MetricPrecision = (typeof METRIC_PRECISIONS)[number]

function isOneOf<T>(options: readonly T[], value: unknown): value is T {
  return (options as readonly unknown[]).includes(value)
}

export const NEXT_ACTIONS_VARIANTS = ["rows", "columns"] as const
export type NextActionsVariant = (typeof NEXT_ACTIONS_VARIANTS)[number]
// 缺欄位的舊文件維持 Columns，避免既有週報開啟後版型改變
const LEGACY_NEXT_ACTIONS_VARIANT: NextActionsVariant = "columns"

export function isNextActionsVariant(
  value: unknown
): value is NextActionsVariant {
  return isOneOf(NEXT_ACTIONS_VARIANTS, value)
}

export function nextActionsVariant(page: NextActionsPage): NextActionsVariant {
  return page.variant ?? LEGACY_NEXT_ACTIONS_VARIANT
}

export type ComparisonMetric = {
  label: string
  baselineValue: number | null
  candidateValue: number | null
  unit: string
  unitPosition: UnitPosition
  unitSpacing: UnitSpacing
  precision: MetricPrecision
}

export type EvidenceDecisionPage = PageChrome & {
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

export type NextActionsPage = PageChrome & {
  id: string
  layout: "next-actions"
  variant?: NextActionsVariant
  title: string
  commitments: Commitment[]
}

export type TrendObservation =
  | { state: "measured"; value: number }
  | { state: "missing" }
  | { state: "unfilled" }

export type TrendCadence = "week" | "month"

export type TrendTargetPage = PageChrome & {
  id: string
  layout: "trend-target"
  title: string
  metric: Pick<
    ComparisonMetric,
    "label" | "unit" | "unitPosition" | "unitSpacing" | "precision"
  >
  cadence: TrendCadence
  // 第一個觀測週期的起點：week 為週一，month 為當月 1 日
  start: string | null
  observations: TrendObservation[]
  target: number | null
  direction: "at-most" | "at-least"
  interpretation: string
  measurementContext: string
}

export type UnknownPage = PageChrome & {
  id: string
  layout: string
  title: string
  [key: string]: unknown
}

export type StructuredPage =
  | TwoColumnPage
  | OverviewPage
  | EvidenceDecisionPage
  | NextActionsPage
  | TrendTargetPage

export type Page =
  | TwoColumnPage
  | HtmlPage
  | OverviewPage
  | EvidenceDecisionPage
  | NextActionsPage
  | TrendTargetPage
  | UnknownPage

// 期間是選填 metadata：週次帶週一到週五，其他 Deck 可以沒有期間
export type DeckPeriod = {
  start: string
  end: string
}

export type Deck = {
  period?: DeckPeriod
  showPageNumbers?: boolean
  pages: Page[]
}

// Editorial Frame 與 Workshop 標題共用；沒有期間時回傳空字串，由呼叫端決定不顯示
export function periodLabel(period: DeckPeriod | undefined): string {
  return period ? `${period.start} — ${period.end}` : ""
}

export function isHtmlPage(page: Page): page is HtmlPage {
  return page.layout === "html" && "htmlFile" in page
}

export function isTwoColumnPage(page: Page): page is TwoColumnPage {
  return page.layout === "two-column" && "items" in page && "panel" in page
}

export function isOverviewPage(page: Page): page is OverviewPage {
  return page.layout === "overview" && "lead" in page && "supporting" in page
}

export function isEvidenceDecisionPage(
  page: Page
): page is EvidenceDecisionPage {
  return (
    page.layout === "evidence-decision" &&
    "verdict" in page &&
    "metrics" in page &&
    "interpretations" in page
  )
}

export function isNextActionsPage(page: Page): page is NextActionsPage {
  return page.layout === "next-actions" && "commitments" in page
}

export function isTrendTargetPage(page: Page): page is TrendTargetPage {
  return page.layout === "trend-target" && "observations" in page
}

export type UnmeasuredState = Exclude<TrendObservation["state"], "measured">

// 已輸入（Measured 或 Missing）的觀測都掛在起點上，決定日期能否清空、cadence 能否切換或需確認才能改
export function hasEnteredObservations(
  observations: readonly TrendObservation[]
): boolean {
  return observations.some((entry) => entry.state !== "unfilled")
}

export function isStructuredPage(page: Page): page is StructuredPage {
  return (
    isTwoColumnPage(page) ||
    isOverviewPage(page) ||
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

export function isSupportedStagePage(page: Page): boolean {
  return matchPage(page, {
    html: () => true,
    overview: () => true,
    evidenceDecision: () => true,
    nextActions: () => true,
    trendTarget: () => true,
    twoColumn: (twoColumn) =>
      SUPPORTED_TWO_COLUMN_PANEL_KINDS.has(twoColumn.panel.kind),
    unknown: () => false,
  })
}

// 經 matchPage 分派：新增版型時編譯器會要求決定它是否保留頁碼位置
function hasPageNumberSlot(page: Page): boolean {
  return matchPage(page, {
    html: () => true,
    overview: () => true,
    evidenceDecision: () => true,
    nextActions: () => true,
    trendTarget: () => true,
    twoColumn: () => false,
    unknown: () => false,
  })
}

/**
 * 單頁未覆寫時的頁碼可見性。HTML Page 的片段可能自帶頁碼，
 * 疊加 overlay 會改變既有輸出，所以不繼承週層級預設、須逐頁開啟。
 */
export function defaultPageNumberVisibility(deck: Deck, page: Page): boolean {
  if (isHtmlPage(page)) {
    return false
  }
  return deck.showPageNumbers ?? true
}

/**
 * 頁碼只畫在 Editorial 與 HTML。隱藏頁已有 Hidden 標記，不再疊一次。
 * 單頁設定優先於預設。
 */
export function isPageNumberVisible(deck: Deck, page: Page): boolean {
  if (page.hidden || !hasPageNumberSlot(page)) {
    return false
  }
  return page.showPageNumber ?? defaultPageNumberVisibility(deck, page)
}

type PageMatchers<T> = {
  html: (page: HtmlPage) => T
  twoColumn: (page: TwoColumnPage) => T
  overview: (page: OverviewPage) => T
  evidenceDecision: (page: EvidenceDecisionPage) => T
  nextActions: (page: NextActionsPage) => T
  trendTarget: (page: TrendTargetPage) => T
  unknown: (page: Page) => T
}

// 已解析頁面的 layout 分支只在這裡打開一次，preview／editor／clone／readiness 共用同一組 identity
export function matchPage<T>(page: Page, matchers: PageMatchers<T>): T {
  if (isHtmlPage(page)) {
    return matchers.html(page)
  }
  if (isTwoColumnPage(page)) {
    return matchers.twoColumn(page)
  }
  if (isOverviewPage(page)) {
    return matchers.overview(page)
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
    owner: "Overview",
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
    throw new Error(`Invalid deck: ${field} must be a string`)
  }

  return value
}

function readNonEmptyString(value: unknown, field: string): string {
  const text = readString(value, field)
  if (text.trim() === "") {
    throw new Error(`Invalid deck: ${field} must be a non-empty string`)
  }

  return text
}

function parseSlideItem(value: unknown, index: number): SlideItem {
  if (!isRecord(value)) {
    throw new Error(`Invalid deck: items[${index}] must be an object`)
  }

  return {
    heading: readString(value.heading, `items[${index}].heading`),
    body: readString(value.body, `items[${index}].body`),
  }
}

function readArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid deck: ${field} must be an array`)
  }

  return value
}

function readNonEmptyArray(value: unknown, field: string): unknown[] {
  const entries = readArray(value, field)
  if (entries.length === 0) {
    throw new Error(`Invalid deck: ${field} must not be empty`)
  }

  return entries
}

function readNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid deck: ${field} must be a finite number`)
  }

  return value
}

function readRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Invalid deck: ${field} must be an object`)
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
        variant: isFlowStepVariant(step.variant) ? step.variant : undefined,
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
      throw new Error(`Invalid deck: unknown panel kind "${kind}"`)
  }
}

const STATUS_TONES = new Set<string>(["positive", "caution", "neutral"])

export function isStatusTone(value: string): value is StatusTone {
  return STATUS_TONES.has(value)
}

function parseStatusSignal(value: unknown, field: string): StatusSignal {
  if (!isRecord(value)) {
    throw new Error(`Invalid deck: ${field} must be an object`)
  }

  const tone = readNonEmptyString(value.tone, `${field}.tone`)
  if (!isStatusTone(tone)) {
    throw new Error(`Invalid deck: ${field}.tone`)
  }

  return {
    label: readString(value.label, `${field}.label`),
    tone,
  }
}

function parseOutcome(value: unknown, field: string): Outcome {
  if (!isRecord(value)) {
    throw new Error(`Invalid deck: ${field} must be an object`)
  }

  return {
    workstream: readString(value.workstream, `${field}.workstream`),
    figure: readString(value.figure, `${field}.figure`),
    result: readString(value.result, `${field}.result`),
    impact: readString(value.impact, `${field}.impact`),
    status: parseStatusSignal(value.status, `${field}.status`),
  }
}

type ParsedPageChrome = PageChrome & {
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
    throw new Error(`Invalid deck: ${field} must have ${entryRangeLabel(rule)}`)
  }

  return value
}

function parseOverviewPage(
  value: Record<string, unknown>,
  chrome: ParsedPageChrome,
  field: string
): OverviewPage {
  const supporting = readEntries(
    value.supporting,
    `${field}.supporting`,
    CARDINALITY.supportingOutcomes
  )

  return withChrome(chrome, "overview", {
    lead: parseOutcome(value.lead, `${field}.lead`),
    supporting: supporting.map((entry, supportingIndex) =>
      parseOutcome(entry, `${field}.supporting[${supportingIndex}]`)
    ),
  })
}

export function hasValidMetricFormat(
  metric: Pick<ComparisonMetric, "unitPosition" | "unitSpacing" | "precision">
): boolean {
  return (
    isOneOf(UNIT_POSITIONS, metric.unitPosition) &&
    isOneOf(UNIT_SPACINGS, metric.unitSpacing) &&
    isOneOf(METRIC_PRECISIONS, metric.precision)
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
    throw new Error(`Invalid deck: ${field}`)
  }
  return value
}

function parseComparisonMetric(
  value: unknown,
  field: string
): ComparisonMetric {
  if (!isRecord(value)) {
    throw new Error(`Invalid deck: ${field} must be an object`)
  }

  const format = parseMetricFormat(value, field)
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
    ...format,
  }
}

function parseMetricFormat(
  value: Record<string, unknown>,
  field: string
): Pick<ComparisonMetric, "unitPosition" | "unitSpacing" | "precision"> {
  const unitPosition = readNonEmptyString(
    value.unitPosition,
    `${field}.unitPosition`
  )
  if (!isOneOf(UNIT_POSITIONS, unitPosition)) {
    throw new Error(`Invalid deck: ${field}.unitPosition`)
  }

  const unitSpacing = readNonEmptyString(
    value.unitSpacing,
    `${field}.unitSpacing`
  )
  if (!isOneOf(UNIT_SPACINGS, unitSpacing)) {
    throw new Error(`Invalid deck: ${field}.unitSpacing`)
  }

  const { precision } = value
  if (!isOneOf(METRIC_PRECISIONS, precision)) {
    throw new Error(`Invalid deck: ${field}.precision`)
  }

  return { unitPosition, unitSpacing, precision }
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
    throw new Error(`Invalid deck: ${field} must be an object`)
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

function parseNextActionsVariant(
  value: unknown,
  field: string
): NextActionsVariant {
  if (value === undefined) return LEGACY_NEXT_ACTIONS_VARIANT
  if (isNextActionsVariant(value)) return value
  throw new Error(`Invalid deck: ${field} must be columns or rows`)
}

function parseTrendTargetPage(
  value: Record<string, unknown>,
  chrome: ParsedPageChrome,
  field: string
): TrendTargetPage {
  const { cadence, start } = parseTrendDating(value, field)
  const observations = parseTrendObservations(value.observations, field)
  assertTrendDating({ cadence, start, observations }, field)
  return withChrome(chrome, "trend-target", {
    metric: parseTrendMetric(value.metric, `${field}.metric`),
    cadence,
    start,
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
  const format = parseMetricFormat(metric, field)
  return {
    label: readString(metric.label, `${field}.label`),
    unit: readString(metric.unit, `${field}.unit`),
    ...format,
  }
}

function parseTrendDirection(
  value: unknown,
  field: string
): TrendTargetPage["direction"] {
  const direction = readNonEmptyString(value, field)
  if (!isTrendDirection(direction)) throw new Error(`Invalid deck: ${field}`)
  return direction
}

// 舊文件只有 startMonday、沒有 cadence：讀成每週序列；存檔後改寫為 cadence + start
function parseTrendDating(
  value: Record<string, unknown>,
  field: string
): Pick<TrendTargetPage, "cadence" | "start"> {
  rejectMixedFormats(
    value,
    { legacy: ["startMonday"], current: ["cadence", "start"] },
    `${field} uses either startMonday or cadence/start, not both`
  )
  if (value.startMonday !== undefined) {
    return {
      cadence: "week",
      start: parseTrendStart(value.startMonday, `${field}.startMonday`),
    }
  }
  if (!isTrendCadence(value.cadence))
    throw new Error(`Invalid deck: ${field}.cadence must be week or month`)
  return {
    cadence: value.cadence,
    start: parseTrendStart(value.start, `${field}.start`),
  }
}

type FieldFormats = { legacy: string[]; current: string[] }

// 舊欄位只為了讀取既有檔案；與新欄位並存時無法判斷以哪個為準，直接拒絕而非擇一
function rejectMixedFormats(
  value: Record<string, unknown>,
  { legacy, current }: FieldFormats,
  message: string
): void {
  const has = (keys: string[]) => keys.some((key) => value[key] !== undefined)
  if (has(legacy) && has(current)) throw new Error(`Invalid deck: ${message}`)
}

function parseTrendStart(value: unknown, field: string): string | null {
  if (value === null) return null
  if (typeof value !== "string") throw new Error(`Invalid deck: ${field}`)
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
  throw new Error(`Invalid deck: ${path}`)
}

function assertTrendDating(
  {
    cadence,
    start,
    observations,
  }: Pick<TrendTargetPage, "cadence" | "start" | "observations">,
  field: string
): void {
  if (start === null) {
    if (hasEnteredObservations(observations))
      throw new Error(
        `Invalid deck: ${field}.start is required for entered observations`
      )
    return
  }
  const datingError = trendDatingError(cadence, start, observations.length)
  if (datingError)
    throw new Error(
      `Invalid deck: ${field}.${datingError.path}: ${datingError.message}`
    )
}

function parseHtmlPage(
  value: Record<string, unknown>,
  chrome: ParsedPageChrome,
  field: string
): HtmlPage {
  const htmlFile = readNonEmptyString(value.htmlFile, `${field}.htmlFile`)

  try {
    validateHtmlFileName(htmlFile)
  } catch (cause: unknown) {
    const message = cause instanceof Error ? cause.message : "Invalid htmlFile"
    throw new Error(`Invalid deck: ${field}.htmlFile: ${message}`, {
      cause,
    })
  }

  return withChrome(chrome, "html", { htmlFile })
}

function parseTwoColumnPage(
  value: Record<string, unknown>,
  chrome: ParsedPageChrome,
  field: string
): TwoColumnPage {
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
) => Page

// parser 面對的是未驗證 JSON，無法走 matchPage；以 layout 表格分派，新增版面只改這裡
const PAGE_PARSERS: Record<SlideLayout, PageParser> = {
  html: parseHtmlPage,
  "two-column": parseTwoColumnPage,
  overview: parseOverviewPage,
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

// 改名前的 layout id；讀入時換成現行 id，存檔後只留新名稱
const LEGACY_LAYOUT_IDS: Record<string, SlideLayout> = {
  "weekly-overview": "overview",
}

function parsePage(value: unknown, index: number): Page {
  const field = `pages[${index}]`
  const page = readRecord(value, field)
  const chrome = parsePageChrome(page, field)
  const rawLayout = readNonEmptyString(page.layout, `${field}.layout`)
  const layout = Object.hasOwn(LEGACY_LAYOUT_IDS, rawLayout)
    ? LEGACY_LAYOUT_IDS[rawLayout]
    : rawLayout

  if (!isKnownLayout(layout)) {
    // 保留未知版面讓 stage 顯示警告並略過匯出，而不是整份 Deck 讀不進來
    return { ...page, ...withChrome(chrome, layout, {}) }
  }

  return PAGE_PARSERS[layout](page, chrome, field)
}

export function parseDeck(value: unknown): Deck {
  if (!isRecord(value)) {
    throw new Error("Invalid deck: root must be an object")
  }

  const pages = value.pages
  if (!Array.isArray(pages) || pages.length === 0) {
    throw new Error("Invalid deck: pages must be a non-empty array")
  }

  const parsedPages = pages.map((page, index) => parsePage(page, index))
  const seenIds = new Set<string>()
  for (const page of parsedPages) {
    if (seenIds.has(page.id)) {
      throw new Error(`Invalid deck: page id "${page.id}" is not unique`)
    }
    seenIds.add(page.id)
  }

  const showPageNumbers =
    typeof value.showPageNumbers === "boolean"
      ? value.showPageNumbers
      : undefined

  const period = parsePeriod(value)

  return {
    ...(period ? { period } : {}),
    ...(showPageNumbers !== undefined ? { showPageNumbers } : {}),
    pages: parsedPages,
  }
}

// 舊格式把期間放在頂層 start／end；讀入時轉成 period，存檔後只留新格式
// 改名前的頂層期間欄位；只為讀取舊檔保留
const LEGACY_PERIOD_FIELDS = ["start", "end"]

function parsePeriod(value: Record<string, unknown>): DeckPeriod | undefined {
  rejectMixedFormats(
    value,
    { legacy: LEGACY_PERIOD_FIELDS, current: ["period"] },
    "use either period or top-level start/end, not both"
  )
  if (value.period !== undefined) {
    if (!isRecord(value.period)) {
      throw new Error("Invalid deck: period must be an object")
    }
    return {
      start: readNonEmptyString(value.period.start, "period.start"),
      end: readNonEmptyString(value.period.end, "period.end"),
    }
  }
  if (LEGACY_PERIOD_FIELDS.every((key) => value[key] === undefined))
    return undefined
  return {
    start: readNonEmptyString(value.start, "start"),
    end: readNonEmptyString(value.end, "end"),
  }
}
