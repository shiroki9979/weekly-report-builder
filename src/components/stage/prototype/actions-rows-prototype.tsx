import { EditorialFrame } from "@/components/stage/editorial-frame"
import type { NextActionsPage } from "@/lib/week-document"

export function ActionsRowsPrototype({ page }: { page: NextActionsPage }) {
  return (
    <EditorialFrame
      eyebrow="Next Actions"
      headline={page.title}
      context={{
        weekLabel: "2026-09-21 — 2026-09-25",
        pageLabel: "",
        showPageNumber: false,
      }}
    >
      <div className="proto-action-headings" aria-hidden="true">
        <span />
        <span>Action & intended outcome</span>
        <span>Verification checkpoint</span>
      </div>
      <ol className="proto-action-rows">
        {page.commitments.map((commitment, index) => (
          <li className="proto-action-row" key={index}>
            <span className="proto-row-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h2>{commitment.title}</h2>
              <p className="proto-row-outcome">{commitment.outcome}</p>
            </div>
            <p className="proto-row-checkpoint">{commitment.checkpoint}</p>
          </li>
        ))}
      </ol>
    </EditorialFrame>
  )
}
