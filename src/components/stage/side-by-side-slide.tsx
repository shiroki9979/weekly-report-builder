import type { SideBySidePage } from "@/lib/deck"
import type { StagePageContext } from "@/lib/stage-page-context"
import { cn } from "@/lib/utils"
import { EditorialFrame } from "./editorial-frame"

type Props = { page: SideBySidePage; context: StagePageContext }

export function SideBySideSlide({ page, context }: Props) {
  return (
    <EditorialFrame
      eyebrow="Comparison"
      headline={page.title}
      context={context}
      boundary={page.boundary}
    >
      <div className="editorial-comparison">
        <div className="editorial-comparison-columns">
          {page.columns.map((column, index) => (
            <section
              key={index}
              aria-label={column.label}
              className={cn(
                "editorial-comparison-column",
                page.chosen === index && "is-chosen"
              )}
            >
              <header className="editorial-comparison-label">
                <h2>{column.label}</h2>
                {page.chosen === index ? (
                  <span className="editorial-chosen-tag">Chosen</span>
                ) : null}
              </header>
              <ol className="editorial-comparison-points">
                {column.points.map((point, pointIndex) => (
                  <li key={pointIndex}>
                    <span
                      className="editorial-comparison-index"
                      aria-hidden="true"
                    >
                      {String(pointIndex + 1).padStart(2, "0")}
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
        {page.tradeoff ? (
          <dl className="editorial-tradeoff">
            <dt>Why</dt>
            <dd>{page.tradeoff.why}</dd>
            {page.tradeoff.cost ? (
              <>
                <dt>Cost</dt>
                <dd>{page.tradeoff.cost}</dd>
              </>
            ) : null}
          </dl>
        ) : null}
      </div>
    </EditorialFrame>
  )
}
