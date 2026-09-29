import type { CSSProperties } from "react"

import { EditorialFrame } from "@/components/stage/editorial-frame"
import type { StagePageContext } from "@/lib/stage-page-context"
import { nextActionsVariant, type NextActionsPage } from "@/lib/deck"

type NextActionsSlideProps = {
  page: NextActionsPage
  context: StagePageContext
}

function formatCommitmentNumber(index: number): string {
  return String(index + 1).padStart(2, "0")
}

export function NextActionsSlide({ page, context }: NextActionsSlideProps) {
  const rows = nextActionsVariant(page) === "rows"
  const actionGridStyle = {
    "--editorial-commitment-count": page.commitments.length,
  } as CSSProperties

  return (
    <EditorialFrame
      eyebrow="Next Actions"
      headline={page.title}
      context={context}
    >
      {rows && (
        <div className="editorial-action-row-headings" aria-hidden="true">
          <span />
          <span>Action & intended outcome</span>
          <span>Verification checkpoint</span>
        </div>
      )}
      <ol
        className={
          rows
            ? "editorial-actions editorial-actions-rows"
            : "editorial-actions"
        }
        style={rows ? undefined : actionGridStyle}
      >
        {page.commitments.map((commitment, index) => (
          <li className="editorial-action" key={index}>
            <p className="editorial-action-num">
              {formatCommitmentNumber(index)}
            </p>
            <div className="editorial-action-main">
              <h2 className="editorial-action-title">{commitment.title}</h2>
              <p className="editorial-action-outcome">{commitment.outcome}</p>
            </div>
            <p className="editorial-checkpoint">{commitment.checkpoint}</p>
          </li>
        ))}
      </ol>
    </EditorialFrame>
  )
}
