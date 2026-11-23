import type { ReactNode } from "react"

import { EditorialFooter } from "@/components/stage/editorial-footer"
import type { EditorialFramePage } from "@/lib/deck"
import { resolveEyebrow } from "@/lib/page-chrome"
import { padPageNumber, type StagePageContext } from "@/lib/stage-page-context"

type EditorialFrameProps = {
  page: EditorialFramePage
  context: StagePageContext
  children: ReactNode
}

/**
 * 結論先入眼；期間與頁碼只做定位，不搶職能層級。
 * chrome 由 Frame 直接從頁面讀取，各版型只提供本文，新增 chrome 欄位時才不必逐版型接線。
 */
export function EditorialFrame({
  page,
  context,
  children,
}: EditorialFrameProps) {
  const position = context.showPageNumber ? context.position : null
  const eyebrow = resolveEyebrow(page)

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
            {/* 沒有 eyebrow 仍保留一行高，標題與本文不隨 § nn 或期間的有無上下跳動 */}
            {eyebrow || "\u00a0"}
          </p>
          {context.frameLabel ? (
            <p className="editorial-period">{context.frameLabel}</p>
          ) : null}
        </div>
        <h1 className="editorial-headline">{page.title}</h1>
      </header>
      <hr className="editorial-rule" />
      <div className="editorial-body">{children}</div>
      {page.boundary ? (
        <p className="editorial-boundary">{page.boundary}</p>
      ) : null}
      <EditorialFooter deckTitle={context.deckTitle} position={position} />
    </article>
  )
}
