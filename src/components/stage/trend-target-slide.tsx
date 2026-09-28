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
  trendEndMonday,
} from "@/lib/trend-target"
import type { TrendObservation, TrendTargetPage } from "@/lib/week-document"

type Props = { page: TrendTargetPage; context: StagePageContext }

const CHART_WIDTH = 1000
const CHART_HEIGHT = 200
const CHART_LEFT = 84
const CHART_RIGHT = 976
const CHART_TOP = 10
const CHART_BOTTOM = 154
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
// 量級極大且彼此極近的值，刻度印成完整數字會全部相同；改以 offset 顯示差值
const LARGE_MAGNITUDE = 1e9
const NARROW_RANGE_RATIO = 1e-6
const OFFSET_TICK_DIGITS = 3
const PLAIN_TICK_DIGITS = 12
// html-to-image 擷取 PNG 時不會把 stylesheet 或 var() 帶進 SVG 子元素，顏色只能以字面值寫在屬性上；
// 數值須與 stage.css／editorial-layouts.css 的同名 token 保持一致
const SVG_INK = {
  line: "#d0d7de",
  mute: "#5c5c5c",
  blue: "#2e75b6",
  warnInk: "#8a5508",
  paper: "#ffffff",
} as const

function latestWeekStatus(page: TrendTargetPage): string {
  const latest = page.observations.at(-1)
  if (latest?.state === "missing") return "No data"
  if (latest?.state !== "measured") return "Not entered"
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
  return Number((value - offset).toPrecision(digits)).toString()
}

function axisOffsetFor([minimum, maximum]: [number, number]): number {
  const crowded =
    Math.abs(minimum) >= LARGE_MAGNITUDE &&
    maximum - minimum < Math.abs(minimum) * NARROW_RANGE_RATIO
  return crowded ? Math.round(minimum) : 0
}

function chartGeometry(
  page: TrendTargetPage,
  [minimum, maximum]: [number, number]
) {
  const x = (index: number) =>
    CHART_LEFT +
    (index * (CHART_RIGHT - CHART_LEFT)) / (page.observations.length - 1)
  const y = (value: number) =>
    CHART_BOTTOM -
    ((value - minimum) / (maximum - minimum)) * (CHART_BOTTOM - CHART_TOP)
  const ticks = Array.from(
    { length: Y_TICK_COUNT },
    (_, index) => minimum + ((maximum - minimum) * index) / (Y_TICK_COUNT - 1)
  )
  const line = page.observations
    .map((entry, index) => {
      if (entry.state !== "measured") return ""
      const previous = page.observations[index - 1]
      return `${previous?.state === "measured" ? "L" : "M"}${x(index)},${y(entry.value)}`
    })
    .join(" ")
  return { axisOffset: axisOffsetFor([minimum, maximum]), x, y, ticks, line }
}

type ChartGeometry = ReturnType<typeof chartGeometry>

function observationText(
  entry: TrendObservation,
  page: TrendTargetPage
): string {
  if (entry.state === "measured") return formatTrendValue(entry.value, page)
  if (entry.state === "missing") return "No observation"
  return "Not entered"
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
        stroke={SVG_INK.line}
        x1={CHART_LEFT}
        x2={CHART_RIGHT}
        y1={y(tick)}
        y2={y(tick)}
      />
      <text
        className="editorial-trend-axis"
        fill={SVG_INK.mute}
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
  entry: TrendObservation
  index: number
  isLatest: boolean
  geometry: ChartGeometry
}) {
  if (entry.state === "measured")
    return (
      <circle
        className="editorial-trend-point"
        fill={SVG_INK.blue}
        stroke={SVG_INK.paper}
        strokeWidth="2"
        cx={geometry.x(index)}
        cy={geometry.y(entry.value)}
        r={isLatest ? LATEST_POINT_RADIUS : POINT_RADIUS}
      />
    )
  if (entry.state === "missing")
    return (
      <text
        className="editorial-trend-missing"
        fill={SVG_INK.warnInk}
        fontSize="20"
        fontWeight="700"
        aria-label="No observation"
        textAnchor="middle"
        x={geometry.x(index)}
        y={CHART_BOTTOM - MISSING_MARK_LIFT}
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
      {page.target !== null ? (
        <line
          className="editorial-trend-target"
          stroke={SVG_INK.warnInk}
          strokeWidth="2"
          strokeDasharray="7 5"
          x1={CHART_LEFT}
          x2={CHART_RIGHT}
          y1={geometry.y(page.target)}
          y2={geometry.y(page.target)}
        />
      ) : null}
      <path
        className="editorial-trend-line"
        fill="none"
        stroke={SVG_INK.blue}
        strokeWidth="3"
        d={geometry.line}
      />
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
          stroke={SVG_INK.line}
          x1={geometry.x(index)}
          x2={geometry.x(index)}
          y1={CHART_BOTTOM}
          y2={CHART_BOTTOM + X_TICK_LENGTH}
        />
        {showsDateLabel(index, page.observations.length) ? (
          <text
            className="editorial-trend-axis"
            fill={SVG_INK.mute}
            x={geometry.x(index)}
            y={CHART_BOTTOM + X_LABEL_OFFSET}
            textAnchor="middle"
          >
            {monday.slice(5).replace("-", "/")}
          </text>
        ) : null}
      </g>
    )
  })
}

function TrendPlot({
  page,
  geometry,
  targetLabel,
}: {
  page: TrendTargetPage
  geometry: ChartGeometry
  targetLabel: string
}) {
  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
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
            × No observation
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
  const geometry = chartGeometry(page, bounds)
  const targetLabel = formatTrendTarget(page) ?? "Target not set"
  return (
    <figure className="editorial-trend-chart">
      <figcaption>
        {metricCaption(page)}
        {geometry.axisOffset !== 0 ? (
          <span className="editorial-trend-axis-offset">
            {axisOffsetNote(geometry.axisOffset)}
          </span>
        ) : null}
      </figcaption>
      <TrendPlot page={page} geometry={geometry} targetLabel={targetLabel} />
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
          {page.direction === "at-most"
            ? "Lower is better"
            : "Higher is better"}
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
