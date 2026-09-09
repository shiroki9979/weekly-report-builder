import type { EvidenceDecisionLayout } from "@/prototype/content"
import { EditorialFrame } from "@/prototype/layouts/editorial-frame"

type EvidenceDecisionProps = {
  layout: EvidenceDecisionLayout
}

type BarRowProps = {
  name: string
  value: string
  barPercent: number
  tone: "baseline" | "candidate"
}

function BarRow({ name, value, barPercent, tone }: BarRowProps) {
  return (
    <div className="proto-bar-row">
      <span className="proto-bar-name">{name}</span>
      <span className="proto-bar-value">{value}</span>
      <div className="proto-bar-track">
        <div
          className={`proto-bar-fill is-${tone}`}
          style={{ width: `${barPercent}%` }}
        />
      </div>
    </div>
  )
}

export function EvidenceDecision({ layout }: EvidenceDecisionProps) {
  return (
    <EditorialFrame
      eyebrow={layout.eyebrow}
      headline={layout.headline}
      weekLabel={layout.weekLabel}
      pageNumber={layout.pageNumber}
    >
      <p className="proto-verdict">{layout.verdict}</p>
      <div className="proto-decision">
        <div className="proto-evidence">
          {layout.metrics.map((metric) => (
            <section className="proto-metric" key={metric.label}>
              <h2 className="proto-metric-label">{metric.label}</h2>
              <BarRow
                name={metric.baselineLabel}
                value={metric.baselineValue}
                barPercent={metric.baselineBarPercent}
                tone="baseline"
              />
              <BarRow
                name={metric.candidateLabel}
                value={metric.candidateValue}
                barPercent={metric.candidateBarPercent}
                tone="candidate"
              />
            </section>
          ))}
        </div>
        <div className="proto-interpret">
          {layout.interpretations.map((text) => (
            <p className="proto-interpret-item" key={text}>
              {text}
            </p>
          ))}
        </div>
      </div>
    </EditorialFrame>
  )
}
