import { EvidenceDecisionSlide } from "@/components/stage/evidence-decision-slide"
import { HtmlSlide } from "@/components/stage/html-slide"
import { NextActionsSlide } from "@/components/stage/next-actions-slide"
import { TwoColumnSlide } from "@/components/stage/two-column-slide"
import { WeeklyOverviewSlide } from "@/components/stage/weekly-overview-slide"
import {
  mondayFromWeekLabel,
  type StagePageContext,
} from "@/lib/stage-page-context"
import { matchWeekPage, type WeekPage } from "@/lib/week-document"

export type StageSlideProps = {
  page: WeekPage
  context: StagePageContext
  isCapture?: boolean
}

export function StageSlide({
  page,
  context,
  isCapture = false,
}: StageSlideProps) {
  const monday = mondayFromWeekLabel(context.weekLabel)

  return (
    <div className="stage-slide-host">
      {context.pageLabel === "Hidden" ? (
        <p className="stage-hidden-label" role="status">
          Hidden
        </p>
      ) : null}
      {matchWeekPage(page, {
        html: (htmlPage) => (
          <HtmlSlide page={htmlPage} monday={monday} isCapture={isCapture} />
        ),
        twoColumn: (twoColumn) => <TwoColumnSlide page={twoColumn} />,
        weeklyOverview: (overview) => (
          <WeeklyOverviewSlide page={overview} context={context} />
        ),
        evidenceDecision: (decision) => (
          <EvidenceDecisionSlide page={decision} context={context} />
        ),
        nextActions: (actions) => (
          <NextActionsSlide page={actions} context={context} />
        ),
        unknown: (unknown) => (
          <div className="stage-warning" role="status">
            Unknown layout: {unknown.layout}
          </div>
        ),
      })}
    </div>
  )
}
