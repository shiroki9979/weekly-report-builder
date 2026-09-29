import { buildStackedBarSegments } from "@/lib/chart-stack"
import type { ChartPanel } from "@/lib/deck"

type ChartPanelViewProps = {
  panel: ChartPanel
}

export function ChartPanelView({ panel }: ChartPanelViewProps) {
  const stacks = buildStackedBarSegments(panel)

  return (
    <aside className="stage-panel">
      <h4>{panel.title}</h4>
      <div className="stage-chart-legend">
        {panel.series.map((series, seriesIndex) => (
          <span key={`${series.name}-${seriesIndex}`}>
            <i
              style={{
                background:
                  series.color ??
                  stacks[0]?.bars[seriesIndex]?.color ??
                  "#2e75b6",
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
