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

function axisLabel(value: number): string {
  return Number(value.toPrecision(12)).toString()
}

function TrendChart({ page }: { page: TrendTargetPage }) {
  let bounds: [number, number]
  try {
    bounds = trendBounds(page)
  } catch {
    return <p role="alert">Trend axis cannot represent these values</p>
  }
  const [minimum, maximum] = bounds
  const width = 1000
  const left = 84
  const right = 976
  const top = 10
  const bottom = 154
  const x = (index: number) =>
    left + (index * (right - left)) / (page.observations.length - 1)
  const y = (value: number) =>
    bottom - ((value - minimum) / (maximum - minimum)) * (bottom - top)
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
  const first = page.startMonday
  const last = trendEndMonday(page)
  const targetLabel =
    page.target === null
      ? "Target not set"
      : `${page.direction === "at-most" ? "≤" : "≥"} ${formatTrendValue(page.target, page)}`
  const described = page.startMonday
    ? page.observations
        .map(
          (entry, index) =>
            `${observationMonday(page.startMonday!, index)}: ${entry.state === "measured" ? formatTrendValue(entry.value, page) : entry.state === "missing" ? "No observation" : "Not entered"}`
        )
        .join("; ")
    : "Starting Monday not set"
  return (
    <figure className="editorial-trend-chart">
      <figcaption>{page.metric.label}</figcaption>
      <svg
        viewBox={`0 0 ${width} 200`}
        role="img"
        aria-label={`${page.metric.label}; ${targetLabel}`}
      >
        <title>{page.metric.label} by week</title>
        <desc>
          {described}; {targetLabel}
        </desc>
        {ticks.map((tick, index) => (
          <g key={index}>
            <line
              className="editorial-trend-grid"
              stroke="#d0d7de"
              x1={left}
              x2={right}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text
              className="editorial-trend-axis"
              fill="#5c5c5c"
              x={left - 12}
              y={y(tick) + 5}
              textAnchor="end"
            >
              {axisLabel(tick)}
            </text>
          </g>
        ))}
        {page.target !== null ? (
          <line
            className="editorial-trend-target"
            stroke="#8a5508"
            strokeWidth="2"
            strokeDasharray="7 5"
            x1={left}
            x2={right}
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
          ) : null
        )}
        {page.startMonday
          ? page.observations.map((_, index) => {
              const monday = observationMonday(page.startMonday!, index)
              return (
                <g key={monday}>
                  <line
                    className="editorial-trend-grid"
                    stroke="#d0d7de"
                    x1={x(index)}
                    x2={x(index)}
                    y1={bottom}
                    y2={bottom + 5}
                  />
                  {page.observations.length <= 8 ||
                  index % 2 === 0 ||
                  index === page.observations.length - 1 ? (
                    <text
                      className="editorial-trend-axis"
                      fill="#5c5c5c"
                      x={x(index)}
                      y={bottom + 25}
                      textAnchor="middle"
                    >
                      {monday.slice(5).replace("-", "/")}
                    </text>
                  ) : null}
                </g>
              )
            })
          : null}
      </svg>
      <div className="editorial-trend-legend">
        <span className="editorial-trend-legend-observed">Observed</span>
        <span className="editorial-trend-legend-target">
          Target {targetLabel}
        </span>
      </div>
      <p className="editorial-trend-range">
        Observed weeks: {first ?? "—"} – {last ?? "—"}
      </p>
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
