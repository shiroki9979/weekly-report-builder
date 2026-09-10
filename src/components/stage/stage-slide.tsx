import { EvidenceDecisionSlide } from "@/components/stage/evidence-decision-slide"
import { HtmlSlide } from "@/components/stage/html-slide"
import { NextActionsSlide } from "@/components/stage/next-actions-slide"
import { TwoColumnSlide } from "@/components/stage/two-column-slide"
import { WeeklyOverviewSlide } from "@/components/stage/weekly-overview-slide"
import {
  mondayFromWeekLabel,
  type StagePageContext,
} from "@/lib/stage-page-context"
import {
  isEvidenceDecisionPage,
  isHtmlWeekPage,
  isNextActionsPage,
  isTwoColumnWeekPage,
  isWeeklyOverviewPage,
  type WeekPage,
} from "@/lib/week-document"

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
      {isHtmlWeekPage(page) ? (
        <HtmlSlide page={page} monday={monday} isCapture={isCapture} />
      ) : isTwoColumnWeekPage(page) ? (
        <TwoColumnSlide page={page} />
      ) : isWeeklyOverviewPage(page) ? (
        <WeeklyOverviewSlide page={page} context={context} />
      ) : isEvidenceDecisionPage(page) ? (
        <EvidenceDecisionSlide page={page} context={context} />
      ) : isNextActionsPage(page) ? (
        <NextActionsSlide page={page} context={context} />
      ) : (
        <div className="stage-warning" role="status">
          Unknown layout: {page.layout}
        </div>
      )}
    </div>
  )
}
