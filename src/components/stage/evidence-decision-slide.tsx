import { EditorialFrame } from "@/components/stage/editorial-frame"
import {
  calculateMetricBarPercents,
  formatMetricValue,
} from "@/lib/metric-format"
import type { StagePageContext } from "@/lib/stage-page-context"
import type {
  ComparisonMetric,
  EvidenceDecisionPage,
} from "@/lib/week-document"

type EvidenceDecisionSlideProps = {
  page: EvidenceDecisionPage
  context: StagePageContext
}

function BarRow({
  name,
  value,
  barPercent,
  tone,
}: {
  name: string
  value: string
  barPercent: number
  tone: "baseline" | "candidate"
}) {
  return (
    <div className="editorial-bar-row">
      <span className="editorial-bar-name">{name}</span>
      <span className="editorial-bar-value">{value}</span>
      <div className="editorial-bar-track">
        <div
          className={`editorial-bar-fill is-${tone}`}
          style={{ width: `${barPercent}%` }}
        />
      </div>
    </div>
  )
}

function MetricBlock({ metric }: { metric: ComparisonMetric }) {
  const format = {
    unit: metric.unit,
    unitPosition: metric.unitPosition,
    unitSpacing: metric.unitSpacing,
    precision: metric.precision,
  }
  const bars = calculateMetricBarPercents(
    metric.baselineValue,
    metric.candidateValue
  )
  const baselineValue = formatMetricValue(metric.baselineValue, format)
  const candidateValue = formatMetricValue(metric.candidateValue, format)

  return (
    <section
      className="editorial-metric"
      aria-label={`${metric.label}: Baseline ${baselineValue}, Candidate ${candidateValue}`}
    >
      <h2 className="editorial-metric-label">{metric.label}</h2>
      <BarRow
        name="Baseline"
        value={baselineValue}
        barPercent={bars.baseline}
        tone="baseline"
      />
      <BarRow
        name="Candidate"
        value={candidateValue}
        barPercent={bars.candidate}
        tone="candidate"
      />
    </section>
  )
}

export function EvidenceDecisionSlide({
  page,
  context,
}: EvidenceDecisionSlideProps) {
  return (
    <EditorialFrame
      eyebrow="Evidence-backed Decision"
      headline={page.title}
      context={context}
    >
      <p className="editorial-verdict">{page.verdict}</p>
      <div className="editorial-decision">
        <div className="editorial-evidence">
          {page.metrics.map((metric, index) => (
            <MetricBlock key={index} metric={metric} />
          ))}
        </div>
        <div className="editorial-interpret" aria-label="Why this verdict">
          {page.interpretations.map((text, index) => (
            <p className="editorial-interpret-item" key={index}>
              {text}
            </p>
          ))}
        </div>
      </div>
    </EditorialFrame>
  )
}
