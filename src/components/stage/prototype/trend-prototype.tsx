import { EditorialFrame } from "@/components/stage/editorial-frame"
import { weekLabels, type TrendFixture } from "./fixtures"

function displayValue(value: number, fixture: TrendFixture): string {
  const gap = fixture.unit === "%" ? "" : " "
  return `${value.toFixed(fixture.precision)}${gap}${fixture.unit}`
}

function targetStatus(fixture: TrendFixture) {
  const latest = fixture.values.at(-1)
  if (latest == null) return { text: "No data", tone: "neutral" }
  const meetsTarget =
    fixture.direction === "at-most"
      ? latest <= fixture.target
      : latest >= fixture.target
  return meetsTarget
    ? { text: "Target met", tone: "positive" }
    : { text: "Target missed", tone: "caution" }
}

function TrendSummary({ fixture }: { fixture: TrendFixture }) {
  const latest = fixture.values.at(-1)
  const status = targetStatus(fixture)
  const operator = fixture.direction === "at-most" ? "≤" : "≥"
  const labels = weekLabels(fixture)

  return (
    <section
      className="proto-trend-summary"
      aria-label="Latest week and target"
    >
      <div>
        <p className="proto-slide-label">Latest week · {labels.at(-1)}</p>
        <p className="proto-latest-value">
          {latest == null ? "—" : displayValue(latest, fixture)}
        </p>
        <p className={`proto-target-status is-${status.tone}`}>{status.text}</p>
      </div>
      <div className="proto-target-detail">
        <p className="proto-slide-label">Weekly target</p>
        <p className="proto-target-value">
          {operator} {displayValue(fixture.target, fixture)}
        </p>
        <p className="proto-target-direction">
          {fixture.direction === "at-most"
            ? "Lower is better"
            : "Higher is better"}
        </p>
      </div>
      <p className="proto-trend-interpretation">{fixture.interpretation}</p>
    </section>
  )
}

function TrendChart({
  fixture,
  compact,
}: {
  fixture: TrendFixture
  compact: boolean
}) {
  const width = compact ? 640 : 900
  const height = compact ? 300 : 180
  const plot = {
    left: 65,
    right: width - 30,
    top: compact ? 28 : 16,
    bottom: height - (compact ? 56 : 38),
  }
  const [minimum, maximum] = fixture.domain
  const labels = weekLabels(fixture)
  const x = (index: number) =>
    plot.left + (index / (fixture.values.length - 1)) * (plot.right - plot.left)
  const y = (value: number) =>
    plot.bottom -
    ((value - minimum) / (maximum - minimum)) * (plot.bottom - plot.top)
  const ticks = Array.from(
    { length: 5 },
    (_, index) => minimum + ((maximum - minimum) * index) / 4
  )
  // 每個缺測點都中斷路徑，避免折線暗示未觀測期間的變化。
  const path = fixture.values
    .map((value, index) => {
      if (value === null) return ""
      const command =
        index === 0 || fixture.values[index - 1] === null ? "M" : "L"
      return `${command}${x(index)},${y(value)}`
    })
    .join(" ")
  const targetLabel = `${fixture.direction === "at-most" ? "≤" : "≥"} ${displayValue(fixture.target, fixture)}`
  const labelInterval = compact && labels.length > 8 ? 3 : 1

  return (
    <figure className="proto-trend-chart">
      <figcaption>{fixture.metric}</figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${fixture.metric}; target ${targetLabel}`}
      >
        <title>{fixture.metric}</title>
        <desc>
          {labels
            .map(
              (week, index) =>
                `${week}: ${fixture.values[index] === null ? "no observation" : displayValue(fixture.values[index]!, fixture)}`
            )
            .join("; ")}
        </desc>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className="proto-gridline"
              x1={plot.left}
              x2={plot.right}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text
              className="proto-axis-label"
              x={plot.left - 14}
              y={y(tick) + 6}
              textAnchor="end"
            >
              {Number(tick.toFixed(2))}
            </text>
          </g>
        ))}
        <line
          className="proto-target-line"
          x1={plot.left}
          x2={plot.right}
          y1={y(fixture.target)}
          y2={y(fixture.target)}
        />
        <path
          className="proto-series-line"
          d={path}
          data-testid="trend-series"
        />
        {fixture.values.map((value, index) =>
          value === null ? (
            <g key={labels[index]}>
              <line
                className="proto-missing-mark"
                x1={x(index) - 5}
                x2={x(index) + 5}
                y1={plot.bottom - 5}
                y2={plot.bottom + 5}
              />
              <line
                className="proto-missing-mark"
                x1={x(index) - 5}
                x2={x(index) + 5}
                y1={plot.bottom + 5}
                y2={plot.bottom - 5}
              />
            </g>
          ) : (
            <circle
              key={labels[index]}
              className="proto-series-point"
              cx={x(index)}
              cy={y(value)}
              r={index === fixture.values.length - 1 ? 6 : 4}
            />
          )
        )}
        {labels.map((week, index) => (
          <g key={week}>
            <line
              className="proto-gridline"
              x1={x(index)}
              x2={x(index)}
              y1={plot.bottom}
              y2={plot.bottom + 5}
            />
            {index % labelInterval === 0 || index === labels.length - 1 ? (
              <text
                className="proto-axis-label"
                x={x(index)}
                y={plot.bottom + 30}
                textAnchor="middle"
              >
                {week.slice(5).replace("-", "/")}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
      <div className="proto-chart-key">
        <span>
          <i className="proto-key-series" />
          Observed
        </span>
        <span>
          <i className="proto-key-target" />
          Target {targetLabel}
        </span>
        {fixture.values.includes(null) ? <span>× No observation</span> : null}
      </div>
    </figure>
  )
}

export function TrendPrototype({
  fixture,
  split,
}: {
  fixture: TrendFixture
  split: boolean
}) {
  return (
    <EditorialFrame
      eyebrow="Trend & Target"
      headline={fixture.headline}
      context={{
        weekLabel: "2026-09-21 — 2026-09-25",
        pageLabel: "",
        showPageNumber: false,
      }}
    >
      <div className={`proto-trend-body ${split ? "is-split" : "is-wide"}`}>
        <TrendChart fixture={fixture} compact={split} />
        <TrendSummary fixture={fixture} />
      </div>
      <p className="proto-source-note">{fixture.context}</p>
    </EditorialFrame>
  )
}
