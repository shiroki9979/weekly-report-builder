import type { OverviewOutcome, WeeklyOverviewLayout } from "@/prototype/content"
import { EditorialFrame } from "@/prototype/layouts/editorial-frame"

type WeeklyOverviewProps = {
  layout: WeeklyOverviewLayout
}

function OutcomeBlock({
  outcome,
  lead = false,
}: {
  outcome: OverviewOutcome
  lead?: boolean
}) {
  return (
    <section className={lead ? "proto-lead" : "proto-support"}>
      <p className="proto-workstream">{outcome.workstream}</p>
      <p className="proto-figure">{outcome.figure}</p>
      <h2 className="proto-result">{outcome.result}</h2>
      <p className="proto-impact">{outcome.impact}</p>
      <p className={`proto-status is-${outcome.tone}`}>{outcome.status}</p>
    </section>
  )
}

export function WeeklyOverview({ layout }: WeeklyOverviewProps) {
  return (
    <EditorialFrame
      eyebrow={layout.eyebrow}
      headline={layout.headline}
      weekLabel={layout.weekLabel}
      pageNumber={layout.pageNumber}
    >
      <div className="proto-overview">
        <OutcomeBlock outcome={layout.lead} lead />
        <OutcomeBlock outcome={layout.supporting[0]} />
        <OutcomeBlock outcome={layout.supporting[1]} />
      </div>
    </EditorialFrame>
  )
}
