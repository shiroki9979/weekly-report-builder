import { useLayoutEffect, useRef, useState } from "react"

import { EditorialFrame } from "@/components/stage/editorial-frame"
import type { StagePageContext } from "@/lib/stage-page-context"
import {
  displayedTrendNumber,
  exactTrendValue,
  formatTrendTarget,
  formatTrendValue,
  observationMonday,
  targetMet,
  trendBounds,
  trendDirectionRule,
  trendEndMonday,
} from "@/lib/trend-target"
import type {
  TrendTargetPage,
  UnmeasuredState,
  WeeklyObservation,
} from "@/lib/week-document"

type Props = { page: TrendTargetPage; context: StagePageContext }

// viewBox 寬度固定，字級與線寬只隨實際寬度縮放；高度依繪圖框的實際比例決定
const CHART_WIDTH = 1000
// 量到繪圖框之前（首次 render 或測試環境）使用的預設比例
const DEFAULT_CHART_HEIGHT = 200
const CHART_LEFT = 120
const CHART_RIGHT = 976
const CHART_TOP = 10
// 圖底保留給 x 軸刻度與日期標籤的高度
const X_AXIS_BAND = 46
// 五個 y 軸刻度標籤（字級 15）互不重疊所需的最小繪圖高度；空間更小時改由 overflow 量測擋下
const MIN_CHART_HEIGHT = CHART_TOP + 72 + X_AXIS_BAND
const Y_TICK_COUNT = 5
const Y_LABEL_GAP = 12
const Y_LABEL_BASELINE = 5
const X_TICK_LENGTH = 5
const X_LABEL_OFFSET = 25
const MISSING_MARK_LIFT = 3
const LATEST_POINT_RADIUS = 6
const POINT_RADIUS = 4
// 超過此週數時改為隔週標日期，避免日期標籤互相重疊
const DENSE_X_AXIS_WEEKS = 8
// 科學記號保留四位有效數字；跨度不到 1% 時改以 offset 顯示差值，避免刻度捨入後相同。
const NARROW_RANGE_RATIO = 1e-2
const OFFSET_TICK_DIGITS = 3
// double 可穩定還原的十進位有效位數；捨去 offset 乘回 magnitude 時的浮點殘差
const OFFSET_SIGNIFICANT_DIGITS = 15
const PLAIN_TICK_DIGITS = 12
// 左側留白約容納八個完整數字，更長的軸標改用科學記號。
const MAX_PLAIN_TICK_CHARS = 8
const SCIENTIFIC_TICK_DECIMALS = 3
// html-to-image 擷取 PNG 時不會把 stylesheet 或 var() 帶進 SVG 子元素，
// SVG 外觀（顏色、線寬、字級）只能以字面值寫在屬性上；顏色須與 stage.css／editorial-layouts.css 的同名 token 一致
const SVG_INK = {
  line: "#d0d7de",
  mute: "#5c5c5c",
  blue: "#2e75b6",
  warnInk: "#8a5508",
  paper: "#ffffff",
} as const

const SVG_STYLE = {
  grid: { stroke: SVG_INK.line },
  axis: { fill: SVG_INK.mute, fontSize: 15 },
  target: { stroke: SVG_INK.warnInk, strokeWidth: 3, strokeDasharray: "7 5" },
  line: { fill: "none", stroke: SVG_INK.blue, strokeWidth: 3 },
  point: { fill: SVG_INK.blue, stroke: SVG_INK.paper, strokeWidth: 2 },
  missing: { fill: SVG_INK.warnInk, fontSize: 20, fontWeight: 700 },
} as const

// 未量測週次的文案依規格集中於此：Missing 在圖上與描述稱 No observation，
// 作為最新週時摘要改稱 No data；Unfilled 一律為 Not entered
const UNMEASURED_COPY: Record<
  UnmeasuredState,
  { observation: string; latestStatus: string }
> = {
  missing: { observation: "No observation", latestStatus: "No data" },
  unfilled: { observation: "Not entered", latestStatus: "Not entered" },
}

function latestWeekStatus(page: TrendTargetPage): string {
  const latest = page.observations.at(-1)
  if (!latest) return UNMEASURED_COPY.unfilled.latestStatus
  if (latest.state !== "measured")
    return UNMEASURED_COPY[latest.state].latestStatus
  if (page.target === null) return "Target not set"
  return targetMet(latest.value, page) ? "Target met" : "Target missed"
}

// 只有在顯示值看起來與目標相同、實際卻不同時才補精確值，避免摘要與狀態互相矛盾
function exactComparison(page: TrendTargetPage): string | null {
  const latest = page.observations.at(-1)
  if (latest?.state !== "measured" || page.target === null) return null
  if (latest.value === page.target) return null
  const { precision } = page.metric
  if (
    displayedTrendNumber(latest.value, precision) !==
    displayedTrendNumber(page.target, precision)
  )
    return null
  const relation = latest.value < page.target ? "<" : ">"
  return `Exact: ${exactTrendValue(latest.value, page)} ${relation} ${exactTrendValue(page.target, page)}`
}

function axisLabel(value: number, offset: number): string {
  const digits = offset ? OFFSET_TICK_DIGITS : PLAIN_TICK_DIGITS
  const rounded = Number((value - offset).toPrecision(digits))
  const plain = rounded.toString()
  return plain.length <= MAX_PLAIN_TICK_CHARS
    ? plain
    : rounded.toExponential(SCIENTIFIC_TICK_DECIMALS)
}

// 軸上空間只夠放月／日，年份由下方的 Observed weeks 範圍交代
function monthDayLabel(monday: string): string {
  const [, month, day] = monday.split("-")
  return `${month}/${day}`
}

function axisOffsetFor([minimum, maximum]: [number, number]): number {
  const span = maximum - minimum
  if (span >= Math.abs(minimum) * NARROW_RANGE_RATIO) return 0
  // 10 的次方在極小跨度下可能下溢，不能讓 offset 計算出 NaN。
  const magnitude = Math.max(
    10 ** Math.floor(Math.log10(span)),
    Number.MIN_VALUE
  )
  return Number(
    (Math.round(minimum / magnitude) * magnitude).toPrecision(
      OFFSET_SIGNIFICANT_DIGITS
    )
  )
}

function chartGeometry(
  page: TrendTargetPage,
  [minimum, maximum]: [number, number],
  height: number
) {
  const bottom = height - X_AXIS_BAND
  const x = (index: number) =>
    CHART_LEFT +
    (index * (CHART_RIGHT - CHART_LEFT)) / (page.observations.length - 1)
  const y = (value: number) =>
    bottom - ((value - minimum) / (maximum - minimum)) * (bottom - CHART_TOP)
  const ticks = Array.from(
    { length: Y_TICK_COUNT },
    (_, index) => minimum + ((maximum - minimum) * index) / (Y_TICK_COUNT - 1)
  ).filter(
    (tick, index, positions) => index === 0 || tick > positions[index - 1]
  )
  const line = page.observations
    .map((entry, index) => {
      if (entry.state !== "measured") return ""
      const previous = page.observations[index - 1]
      return `${previous?.state === "measured" ? "L" : "M"}${x(index)},${y(entry.value)}`
    })
    .join(" ")
  return {
    axisOffset: axisOffsetFor([minimum, maximum]),
    height,
    bottom,
    x,
    y,
    ticks,
    line,
  }
}

type ChartGeometry = ReturnType<typeof chartGeometry>

function observationText(
  entry: WeeklyObservation,
  page: TrendTargetPage
): string {
  return entry.state === "measured"
    ? formatTrendValue(entry.value, page)
    : UNMEASURED_COPY[entry.state].observation
}

function trendDescription(page: TrendTargetPage): string {
  const { startMonday } = page
  if (!startMonday) return "Starting Monday not set"
  return page.observations
    .map(
      (entry, index) =>
        `${observationMonday(startMonday, index)}: ${observationText(entry, page)}`
    )
    .join("; ")
}

function metricCaption(page: TrendTargetPage): string {
  const { label, unit } = page.metric
  return unit ? `${label} (${unit})` : label
}

function TrendYAxis({ geometry }: { geometry: ChartGeometry }) {
  const { axisOffset, y, ticks } = geometry
  return ticks.map((tick, index) => (
    <g key={index}>
      <line
        className="editorial-trend-grid"
        {...SVG_STYLE.grid}
        x1={CHART_LEFT}
        x2={CHART_RIGHT}
        y1={y(tick)}
        y2={y(tick)}
      />
      <text
        className="editorial-trend-axis"
        {...SVG_STYLE.axis}
        x={CHART_LEFT - Y_LABEL_GAP}
        y={y(tick) + Y_LABEL_BASELINE}
        textAnchor="end"
      >
        {axisLabel(tick, axisOffset)}
      </text>
    </g>
  ))
}

function TrendMarker({
  entry,
  index,
  isLatest,
  geometry,
}: {
  entry: WeeklyObservation
  index: number
  isLatest: boolean
  geometry: ChartGeometry
}) {
  if (entry.state === "measured")
    return (
      <circle
        className="editorial-trend-point"
        {...SVG_STYLE.point}
        cx={geometry.x(index)}
        cy={geometry.y(entry.value)}
        r={isLatest ? LATEST_POINT_RADIUS : POINT_RADIUS}
      />
    )
  if (entry.state === "missing")
    return (
      <text
        className="editorial-trend-missing"
        {...SVG_STYLE.missing}
        aria-label={UNMEASURED_COPY.missing.observation}
        textAnchor="middle"
        x={geometry.x(index)}
        y={geometry.bottom - MISSING_MARK_LIFT}
      >
        ×
      </text>
    )
  return null
}

function TrendSeries({
  page,
  geometry,
}: {
  page: TrendTargetPage
  geometry: ChartGeometry
}) {
  return (
    <>
      <path
        className="editorial-trend-line"
        {...SVG_STYLE.line}
        d={geometry.line}
      />
      {page.target !== null ? (
        <line
          className="editorial-trend-target"
          {...SVG_STYLE.target}
          x1={CHART_LEFT}
          x2={CHART_RIGHT}
          y1={geometry.y(page.target)}
          y2={geometry.y(page.target)}
        />
      ) : null}
      {page.observations.map((entry, index) => (
        <TrendMarker
          key={index}
          entry={entry}
          index={index}
          isLatest={index === page.observations.length - 1}
          geometry={geometry}
        />
      ))}
    </>
  )
}

function showsDateLabel(index: number, length: number): boolean {
  return length <= DENSE_X_AXIS_WEEKS || index % 2 === 0 || index === length - 1
}

function TrendXAxis({
  page,
  geometry,
}: {
  page: TrendTargetPage
  geometry: ChartGeometry
}) {
  const { startMonday } = page
  if (!startMonday) return null
  return page.observations.map((_, index) => {
    const monday = observationMonday(startMonday, index)
    return (
      <g key={monday}>
        <line
          className="editorial-trend-grid"
          {...SVG_STYLE.grid}
          x1={geometry.x(index)}
          x2={geometry.x(index)}
          y1={geometry.bottom}
          y2={geometry.bottom + X_TICK_LENGTH}
        />
        {showsDateLabel(index, page.observations.length) ? (
          <text
            className="editorial-trend-axis"
            {...SVG_STYLE.axis}
            x={geometry.x(index)}
            y={geometry.bottom + X_LABEL_OFFSET}
            textAnchor="middle"
          >
            {monthDayLabel(monday)}
          </text>
        ) : null}
      </g>
    )
  })
}

type PlotBox = { layoutWidth: number; heightRatio: number }

// 依繪圖框的實際寬高比決定 viewBox 高度：圖表維持全寬，字級不會因 meet 等比縮放而變小；
// 繪圖框小於最小高度時撐開版面，讓 overflow 量測擋下匯出，而不是壓到下方的摘要
function useFittedChartHeight() {
  const ref = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<PlotBox | null>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      // 比例取小數精度的 bounding box（預覽的 transform 為等比縮放，不影響比例），
      // 最小高度則以不受 transform 影響的排版寬度換算
      const rect = element.getBoundingClientRect()
      if (!rect.width) return
      const next = {
        layoutWidth: element.offsetWidth,
        heightRatio: rect.height / rect.width,
      }
      setBox((current) =>
        current?.layoutWidth === next.layoutWidth &&
        current.heightRatio === next.heightRatio
          ? current
          : next
      )
    }
    measure()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  if (!box) return { ref, height: DEFAULT_CHART_HEIGHT, minHeightPx: undefined }
  return {
    ref,
    height: Math.max(CHART_WIDTH * box.heightRatio, MIN_CHART_HEIGHT),
    minHeightPx: (MIN_CHART_HEIGHT * box.layoutWidth) / CHART_WIDTH,
  }
}

function TrendPlot({
  page,
  bounds,
  targetLabel,
}: {
  page: TrendTargetPage
  bounds: [number, number]
  targetLabel: string
}) {
  const { ref, height, minHeightPx } = useFittedChartHeight()
  const geometry = chartGeometry(page, bounds, height)
  return (
    <div
      ref={ref}
      className="editorial-trend-plot"
      style={minHeightPx === undefined ? undefined : { minHeight: minHeightPx }}
    >
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${geometry.height}`}
        role="img"
        aria-label={`${metricCaption(page)}; ${targetLabel}`}
      >
        <title>{metricCaption(page)} by week</title>
        <desc>
          {trendDescription(page)}; {targetLabel}
        </desc>
        <TrendYAxis geometry={geometry} />
        <TrendSeries page={page} geometry={geometry} />
        <TrendXAxis page={page} geometry={geometry} />
      </svg>
    </div>
  )
}

function TrendLegend({
  page,
  targetLabel,
}: {
  page: TrendTargetPage
  targetLabel: string
}) {
  return (
    <>
      <div className="editorial-trend-legend">
        <span className="editorial-trend-legend-observed">Observed</span>
        <span className="editorial-trend-legend-target">
          Target {targetLabel}
        </span>
        {page.observations.some((entry) => entry.state === "missing") ? (
          <span className="editorial-trend-legend-missing">
            × {UNMEASURED_COPY.missing.observation}
          </span>
        ) : null}
      </div>
      <p className="editorial-trend-range">
        Observed weeks: {page.startMonday ?? "—"} –{" "}
        {trendEndMonday(page) ?? "—"}
      </p>
    </>
  )
}

function axisOffsetNote(offset: number): string {
  const sign = offset > 0 ? "+" : ""
  return ` · Y-axis offset ${sign}${offset.toExponential()}`
}

function TrendChart({ page }: { page: TrendTargetPage }) {
  let bounds: [number, number]
  try {
    bounds = trendBounds(page)
  } catch {
    // 原因已由 Export Readiness 的 trendAxisIssues 回報並阻擋匯出，這裡只負責不讓預覽崩潰
    return <p role="alert">Trend axis cannot represent these values</p>
  }
  const axisOffset = axisOffsetFor(bounds)
  const targetLabel = formatTrendTarget(page) ?? "Target not set"
  return (
    <figure className="editorial-trend-chart">
      <figcaption>
        {metricCaption(page)}
        {axisOffset !== 0 ? (
          <span className="editorial-trend-axis-offset">
            {axisOffsetNote(axisOffset)}
          </span>
        ) : null}
      </figcaption>
      <TrendPlot page={page} bounds={bounds} targetLabel={targetLabel} />
      <TrendLegend page={page} targetLabel={targetLabel} />
    </figure>
  )
}

function TrendSummary({ page }: { page: TrendTargetPage }) {
  const latest = page.observations.at(-1)
  return (
    <section
      className="editorial-trend-summary"
      aria-label="Latest week and target"
    >
      <div>
        <p className="editorial-trend-label">
          Latest week · {trendEndMonday(page) ?? "—"}
        </p>
        <p className="editorial-trend-value">
          {latest?.state === "measured"
            ? formatTrendValue(latest.value, page)
            : "—"}
        </p>
        <p className="editorial-trend-status">{latestWeekStatus(page)}</p>
      </div>
      <div>
        <p className="editorial-trend-label">Weekly target</p>
        <p className="editorial-trend-value">
          {formatTrendTarget(page) ?? "—"}
        </p>
        <p className="editorial-trend-direction">
          {trendDirectionRule(page.direction).preference}
        </p>
      </div>
      <p className="editorial-trend-interpretation">{page.interpretation}</p>
    </section>
  )
}

export function TrendTargetSlide({ page, context }: Props) {
  const comparison = exactComparison(page)
  return (
    <EditorialFrame
      eyebrow="Trend & Target"
      headline={page.title}
      context={context}
    >
      <div className="editorial-trend">
        <TrendChart page={page} />
        <TrendSummary page={page} />
        {comparison ? (
          <p className="editorial-trend-exact">{comparison}</p>
        ) : null}
        <p className="editorial-trend-context">
          Measurement Context: {page.measurementContext}
        </p>
      </div>
    </EditorialFrame>
  )
}
