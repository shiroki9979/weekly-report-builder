import { FullWidthPanelSlide } from "@/components/stage/full-width-panel-slide"
import { SideBySideSlide } from "./side-by-side-slide"
import { CoverSlide } from "./cover-slide"
import { ClosingSlide } from "./closing-slide"
import { EvidenceDecisionSlide } from "@/components/stage/evidence-decision-slide"
import { HtmlSlide } from "@/components/stage/html-slide"
import { NextActionsSlide } from "@/components/stage/next-actions-slide"
import { TwoColumnSlide } from "@/components/stage/two-column-slide"
import { OverviewSlide } from "@/components/stage/overview-slide"
import { TrendTargetSlide } from "@/components/stage/trend-target-slide"
import {
  formatPagePosition,
  type StagePageContext,
} from "@/lib/stage-page-context"
import { isHtmlPage, matchPage, type Page } from "@/lib/deck"

export type StageSlideProps = {
  page: Page
  context: StagePageContext
  isCapture?: boolean
}

export function StageSlide({
  page,
  context,
  isCapture = false,
}: StageSlideProps) {
  return (
    <div className="stage-slide-host">
      {context.hidden ? (
        <p className="stage-hidden-label" role="status">
          Hidden
        </p>
      ) : null}
      {matchPage(page, {
        fullWidthPanel: (fullWidth) => (
          <FullWidthPanelSlide page={fullWidth} context={context} />
        ),
        sideBySide: (comparison) => (
          <SideBySideSlide page={comparison} context={context} />
        ),
        cover: (cover) => <CoverSlide page={cover} context={context} />,
        closing: (closing) => <ClosingSlide page={closing} context={context} />,
        html: (htmlPage) => (
          <HtmlSlide
            page={htmlPage}
            documentId={context.documentId}
            isCapture={isCapture}
          />
        ),
        twoColumn: (twoColumn) => <TwoColumnSlide page={twoColumn} />,
        overview: (overview) => (
          <OverviewSlide page={overview} context={context} />
        ),
        evidenceDecision: (decision) => (
          <EvidenceDecisionSlide page={decision} context={context} />
        ),
        nextActions: (actions) => (
          <NextActionsSlide page={actions} context={context} />
        ),
        trendTarget: (trend) => (
          <TrendTargetSlide page={trend} context={context} />
        ),
        unknown: (unknown) => (
          <div className="stage-warning" role="status">
            Unknown layout: {unknown.layout}
          </div>
        ),
      })}
      {isHtmlPage(page) && context.showPageNumber ? (
        <footer className="stage-page-number">
          {formatPagePosition(context.position)}
        </footer>
      ) : null}
    </div>
  )
}
