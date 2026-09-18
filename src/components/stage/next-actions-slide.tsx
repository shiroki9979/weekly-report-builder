import type { CSSProperties } from "react"

import { EditorialFrame } from "@/components/stage/editorial-frame"
import type { StagePageContext } from "@/lib/stage-page-context"
import type { NextActionsPage } from "@/lib/week-document"

type NextActionsSlideProps = {
  page: NextActionsPage
  context: StagePageContext
}

function formatCommitmentNumber(index: number): string {
  return String(index + 1).padStart(2, "0")
}

export function NextActionsSlide({ page, context }: NextActionsSlideProps) {
  const actionGridStyle = {
    "--editorial-commitment-count": page.commitments.length,
  } as CSSProperties

  return (
    <EditorialFrame
      eyebrow="Next Actions"
      headline={page.title}
      context={context}
    >
      <ol className="editorial-actions" style={actionGridStyle}>
        {page.commitments.map((commitment, index) => (
          <li className="editorial-action" key={index}>
            <p className="editorial-action-num">
              {formatCommitmentNumber(index)}
            </p>
            <h2 className="editorial-action-title">{commitment.title}</h2>
            <p className="editorial-action-outcome">{commitment.outcome}</p>
            <p className="editorial-checkpoint">{commitment.checkpoint}</p>
          </li>
        ))}
      </ol>
    </EditorialFrame>
  )
}
