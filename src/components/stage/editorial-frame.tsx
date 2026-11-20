import type { ReactNode } from "react"

import { EditorialFooter } from "@/components/stage/editorial-footer"
import type { StagePageContext } from "@/lib/stage-page-context"

type EditorialFrameProps = {
  eyebrow: string
  headline: string
  context: StagePageContext
  boundary?: string
  children: ReactNode
}

/** 結論先入眼；期間與頁碼只做定位，不搶職能層級 */
export function EditorialFrame({
  eyebrow,
  headline,
  context,
  boundary,
  children,
}: EditorialFrameProps) {
  const position = context.showPageNumber ? context.position : null
  const index = position?.index.toString().padStart(2, "0")

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
      {boundary ? <p className="editorial-boundary">{boundary}</p> : null}
      <EditorialFooter deckTitle={context.deckTitle} position={position} />
    </article>
  )
}
