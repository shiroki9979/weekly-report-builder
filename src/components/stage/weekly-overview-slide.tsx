import { EditorialFrame } from "@/components/stage/editorial-frame"
import type { StagePageContext } from "@/lib/stage-page-context"
import type { Outcome, WeeklyOverviewPage } from "@/lib/week-document"

type WeeklyOverviewSlideProps = {
  page: WeeklyOverviewPage
  context: StagePageContext
}

function OutcomeBlock({
  outcome,
  lead = false,
}: {
  outcome: Outcome
  lead?: boolean
}) {
  return (
    <section className={lead ? "editorial-lead" : "editorial-support"}>
      <p className="editorial-workstream">{outcome.workstream}</p>
      <p className="editorial-figure">{outcome.figure}</p>
      <h2 className="editorial-result">{outcome.result}</h2>
      <p className="editorial-impact">{outcome.impact}</p>
      <p className={`editorial-status is-${outcome.status.tone}`}>
        {outcome.status.label}
      </p>
    </section>
  )
}

export function WeeklyOverviewSlide({
  page,
  context,
}: WeeklyOverviewSlideProps) {
  return (
    <EditorialFrame
      eyebrow="Weekly Overview"
      headline={page.title}
      context={context}
    >
      <div className="editorial-overview">
        <OutcomeBlock outcome={page.lead} lead />
        <div className="editorial-supporting">
          {page.supporting.map((outcome, index) => (
            <OutcomeBlock key={index} outcome={outcome} />
          ))}
        </div>
      </div>
    </EditorialFrame>
  )
}
