import type { CoverPage } from "@/lib/deck"
import type { StagePageContext } from "@/lib/stage-page-context"

type Props = { page: CoverPage; context: StagePageContext }

export function CoverSlide({ page, context }: Props) {
  return (
    <article className="editorial-page editorial-cover">
      <div className="editorial-cover-content">
        <h1 className="editorial-cover-title">{page.title}</h1>
        {page.subtitle ? (
          <p className="editorial-cover-subtitle">{page.subtitle}</p>
        ) : null}
        {page.byline || context.frameLabel ? (
          <dl className="editorial-cover-meta">
            {page.byline ? (
              <div>
                <dt>Presented by</dt>
                <dd>{page.byline}</dd>
              </div>
            ) : null}
            {context.frameLabel ? (
              <div>
                <dt>Period</dt>
                <dd>{context.frameLabel}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>
      <footer
        className="editorial-page-number"
        aria-hidden={!context.deckTitle || undefined}
      >
        {context.deckTitle ? (
          <span className="editorial-deck-title">{context.deckTitle}</span>
        ) : (
          " "
        )}
      </footer>
    </article>
  )
}
