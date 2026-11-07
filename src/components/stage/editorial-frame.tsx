import type { ReactNode } from "react"

import {
  formatPagePosition,
  type StagePageContext,
} from "@/lib/stage-page-context"

type EditorialFrameProps = {
  eyebrow: string
  headline: string
  context: StagePageContext
  children: ReactNode
}

/** 結論先入眼；期間與頁碼只做定位，不搶職能層級 */
export function EditorialFrame({
  eyebrow,
  headline,
  context,
  children,
}: EditorialFrameProps) {
  const position = context.showPageNumber ? context.position : null
  const index = position?.index.toString().padStart(2, "0")
  const paddedLabel = position
    ? `${index} / ${position.total.toString().padStart(2, "0")}`
    : null

  return (
    <article className="editorial-page">
      <header className="editorial-header">
        <div className="editorial-meta">
          <p className="editorial-eyebrow">
            {position ? (
              <span className="editorial-page-index">§ {index} </span>
            ) : null}
            {eyebrow}
          </p>
          {context.frameLabel ? (
            <p className="editorial-period">{context.frameLabel}</p>
          ) : null}
        </div>
        <h1 className="editorial-headline">{headline}</h1>
      </header>
      <hr className="editorial-rule" />
      <div className="editorial-body">{children}</div>
      <footer
        className="editorial-page-number"
        aria-hidden={!context.deckTitle && !position ? true : undefined}
      >
        {context.deckTitle ? (
          <span className="editorial-deck-title">{context.deckTitle}</span>
        ) : null}
        {position ? (
          <span className="editorial-page-label">
            <span className="editorial-number-default">
              {formatPagePosition(position)}
            </span>
            <span className="editorial-number-padded">{paddedLabel}</span>
          </span>
        ) : null}
        {!context.deckTitle && !position ? " " : null}
      </footer>
    </article>
  )
}
