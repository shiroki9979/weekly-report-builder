import type { ReactNode } from "react"

import { EditorialFooter } from "@/components/stage/editorial-footer"
import { padPageNumber, type StagePageContext } from "@/lib/stage-page-context"

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

  return (
    <article className="editorial-page">
      <header className="editorial-header">
        <div className="editorial-meta">
          <p className="editorial-eyebrow">
            {position ? (
              <span className="editorial-page-index">
                § {padPageNumber(position.index)}{" "}
              </span>
            ) : null}
            {/* 空 eyebrow 仍保留一行高，標題與本文不隨 § nn 或期間的有無上下跳動 */}
            {eyebrow || "\u00a0"}
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
