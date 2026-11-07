import { buildStackedBarSegments, resolveSeriesColor } from "@/lib/chart-stack"
import type { ChartPanel } from "@/lib/deck"

type ChartPanelViewProps = {
  panel: ChartPanel
  showTitle?: boolean
}

export function ChartPanelView({
  panel,
  showTitle = true,
}: ChartPanelViewProps) {
  const stacks = buildStackedBarSegments(panel)

  return (
    <aside className="stage-panel">
      {showTitle ? <h4>{panel.title}</h4> : null}
      <div className="stage-chart-legend">
        {panel.series.map((series, seriesIndex) => (
          <span key={`${series.name}-${seriesIndex}`}>
            <i
              style={{
                background: resolveSeriesColor(series.color, seriesIndex),
              }}
            />
            {series.name}
          </span>
        ))}
      </div>
      <div className="stage-chart">
        {stacks.map((stack, stackIndex) => (
          <div className="stage-chart-col" key={stackIndex}>
            <div className="stage-chart-stack">
              {stack.bars.map((bar, barIndex) => (
                <div
                  key={`${stack.category}-${barIndex}`}
                  className="stage-chart-bar"
                  data-testid="chart-bar-segment"
                  style={{
                    height: `${bar.heightPercent}%`,
                    background: bar.color,
                  }}
                />
              ))}
            </div>
            <span>{stack.category}</span>
          </div>
        ))}
      </div>
    </aside>
  )
}
