import type { NextActionsLayout } from "@/prototype/content"
import { EditorialFrame } from "@/prototype/layouts/editorial-frame"

type NextActionsProps = {
  layout: NextActionsLayout
}

export function NextActions({ layout }: NextActionsProps) {
  return (
    <EditorialFrame
      eyebrow={layout.eyebrow}
      headline={layout.headline}
      weekLabel={layout.weekLabel}
      pageNumber={layout.pageNumber}
    >
      <ol className="proto-actions">
        {layout.commitments.map((commitment) => (
          <li className="proto-action" key={commitment.number}>
            <p className="proto-action-num">{commitment.number}</p>
            <h2 className="proto-action-title">{commitment.title}</h2>
            <p className="proto-action-outcome">{commitment.outcome}</p>
            <p className="proto-checkpoint">{commitment.checkpoint}</p>
          </li>
        ))}
      </ol>
    </EditorialFrame>
  )
}
