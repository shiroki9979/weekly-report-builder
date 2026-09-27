import { EditorialFrame } from "@/components/stage/editorial-frame"
import type { StagePageContext } from "@/lib/stage-page-context"
import {
  exactTrendValue,
  formatTrendValue,
  observationMonday,
  targetMet,
  trendBounds,
  trendEndMonday,
} from "@/lib/trend-target"
import type { TrendTargetPage } from "@/lib/week-document"

type Props = { page: TrendTargetPage; context: StagePageContext }

function status(page: TrendTargetPage): string {
  const latest = page.observations.at(-1)
  if (latest?.state === "missing") return "No data"
  if (latest?.state !== "measured") return "Not entered"
  if (page.target === null) return "Target not set"
  return targetMet(latest.value, page) ? "Target met" : "Target missed"
}

function exactComparison(page: TrendTargetPage): string | null {
  const latest = page.observations.at(-1)
  if (latest?.state !== "measured" || page.target === null) return null
  if (latest.value === page.target) return null
  if (
    latest.value.toFixed(page.metric.precision) !==
    page.target.toFixed(page.metric.precision)
  )
    return null
  const relation = latest.value < page.target ? "<" : ">"
  return `Exact: ${exactTrendValue(latest.value, page)} ${relation} ${exactTrendValue(page.target, page)}`
}

function axisLabel(value: number, offset: number): string {
  return Number((value - offset).toPrecision(offset ? 3 : 12)).toString()
}

const CHART_WIDTH = 1000
const CHART_LEFT = 84
const CHART_RIGHT = 976
const CHART_TOP = 10
const CHART_BOTTOM = 154

function chartGeometry(
  page: TrendTargetPage,
  [minimum, maximum]: [number, number]
) {
  const axisOffset =
    Math.abs(minimum) >= 1e9 && maximum - minimum < Math.abs(minimum) * 1e-6
      ? Math.round(minimum)
      : 0
  const x = (index: number) =>
    CHART_LEFT +
    (index * (CHART_RIGHT - CHART_LEFT)) / (page.observations.length - 1)
  const y = (value: number) =>
    CHART_BOTTOM -
    ((value - minimum) / (maximum - minimum)) * (CHART_BOTTOM - CHART_TOP)
  const ticks = Array.from(
    { length: 5 },
    (_, index) => minimum + ((maximum - minimum) * index) / 4
  )
  const line = page.observations
    .map((entry, index) => {
      if (entry.state !== "measured") return ""
      const previous = page.observations[index - 1]
      return `${previous?.state === "measured" ? "L" : "M"}${x(index)},${y(entry.value)}`
    })
    .join(" ")
  return { axisOffset, x, y, ticks, line }
}

type ChartGeometry = ReturnType<typeof chartGeometry>

function trendDescription(page: TrendTargetPage): string {
  if (!page.startMonday) return "Starting Monday not set"
  return page.observations
    .map(
      (entry, index) =>
        `${observationMonday(page.startMonday!, index)}: ${entry.state === "measured" ? formatTrendValue(entry.value, page) : entry.state === "missing" ? "No observation" : "Not entered"}`
    )
    .join("; ")
}

function TrendYAxis({ geometry }: { geometry: ChartGeometry }) {
  const { axisOffset, y, ticks } = geometry
  return ticks.map((tick, index) => (
    <g key={index}>
      <line
        className="editorial-trend-grid"
        stroke="#d0d7de"
        x1={CHART_LEFT}
        x2={CHART_RIGHT}
        y1={y(tick)}
        y2={y(tick)}
      />
      <text
        className="editorial-trend-axis"
        fill="#5c5c5c"
        x={CHART_LEFT - 12}
        y={y(tick) + 5}
        textAnchor="end"
      >
        {axisLabel(tick, axisOffset)}
      </text>
    </g>
  ))
}

function TrendSeries({
  page,
  geometry,
}: {
  page: TrendTargetPage
  geometry: ChartGeometry
}) {
  const { x, y, line } = geometry
  return (
    <>
      {page.target !== null ? (
        <line
          className="editorial-trend-target"
          stroke="#8a5508"
          strokeWidth="2"
          strokeDasharray="7 5"
          x1={CHART_LEFT}
          x2={CHART_RIGHT}
          y1={y(page.target)}
          y2={y(page.target)}
        />
      ) : null}
      <path
        className="editorial-trend-line"
        d={line}
        fill="none"
        stroke="#2e75b6"
        strokeWidth="3"
      />
      {page.observations.map((entry, index) =>
        entry.state === "measured" ? (
          <circle
            key={index}
            className="editorial-trend-point"
            fill="#2e75b6"
            stroke="white"
            strokeWidth="2"
            cx={x(index)}
            cy={y(entry.value)}
            r={index === page.observations.length - 1 ? 6 : 4}
          />
        ) : entry.state === "missing" ? (
          <text
            key={index}
            className="editorial-trend-missing"
            aria-label="No observation"
            fill="#8a5508"
            fontSize="20"
            fontWeight="700"
            textAnchor="middle"
            x={x(index)}
            y={CHART_BOTTOM - 3}
          >
            ×
          </text>
        ) : null
      )}
    </>
  )
}

function TrendXAxis({
  page,
  geometry,
}: {
  page: TrendTargetPage
  geometry: ChartGeometry
}) {
  if (!page.startMonday) return null
  return page.observations.map((_, index) => {
    const monday = observationMonday(page.startMonday!, index)
    return (
      <g key={monday}>
        <line
          className="editorial-trend-grid"
          stroke="#d0d7de"
          x1={geometry.x(index)}
          x2={geometry.x(index)}
          y1={CHART_BOTTOM}
          y2={CHART_BOTTOM + 5}
        />
        {page.observations.length <= 8 ||
        index % 2 === 0 ||
        index === page.observations.length - 1 ? (
          <text
            className="editorial-trend-axis"
            fill="#5c5c5c"
            x={geometry.x(index)}
            y={CHART_BOTTOM + 25}
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
      viewBox={`0 0 ${CHART_WIDTH} 200`}
      role="img"
      aria-label={`${page.metric.label}; ${targetLabel}`}
    >
      <title>{page.metric.label} by week</title>
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

function TrendChart({ page }: { page: TrendTargetPage }) {
  let bounds: [number, number]
  try {
    bounds = trendBounds(page)
  } catch {
    return <p role="alert">Trend axis cannot represent these values</p>
  }
  const geometry = chartGeometry(page, bounds)
  const targetLabel =
    page.target === null
      ? "Target not set"
      : `${page.direction === "at-most" ? "≤" : "≥"} ${formatTrendValue(page.target, page)}`
  return (
    <figure className="editorial-trend-chart">
      <figcaption>
        {page.metric.label}
        {geometry.axisOffset !== 0 ? (
          <span className="editorial-trend-axis-offset">
            {` · Y-axis offset ${geometry.axisOffset > 0 ? "+" : ""}${geometry.axisOffset.toExponential()}`}
          </span>
        ) : null}
      </figcaption>
      <TrendPlot page={page} geometry={geometry} targetLabel={targetLabel} />
      <TrendLegend page={page} targetLabel={targetLabel} />
    </figure>
  )
}

export function TrendTargetSlide({ page, context }: Props) {
  const latest = page.observations.at(-1)
  const date = trendEndMonday(page)
  const comparison = exactComparison(page)
  return (
    <EditorialFrame
      eyebrow="Trend & Target"
      headline={page.title}
      context={context}
    >
      <div className="editorial-trend">
        <TrendChart page={page} />
        <section
          className="editorial-trend-summary"
          aria-label="Latest week and target"
        >
          <div>
            <p className="editorial-trend-label">Latest week · {date ?? "—"}</p>
            <p className="editorial-trend-value">
              {latest?.state === "measured"
                ? formatTrendValue(latest.value, page)
                : "—"}
            </p>
            <p className="editorial-trend-status">{status(page)}</p>
          </div>
          <div>
            <p className="editorial-trend-label">Weekly target</p>
            <p className="editorial-trend-value">
              {page.target === null
                ? "—"
                : `${page.direction === "at-most" ? "≤" : "≥"} ${formatTrendValue(page.target, page)}`}
            </p>
            <p className="editorial-trend-direction">
              {page.direction === "at-most"
                ? "Lower is better"
                : "Higher is better"}
            </p>
          </div>
          <p className="editorial-trend-interpretation">
            {page.interpretation}
          </p>
        </section>
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
