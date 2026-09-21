import type { ReactNode } from "react"

import type { StagePageContext } from "@/lib/stage-page-context"

type EditorialFrameProps = {
  eyebrow: string
  headline: string
  context: StagePageContext
  children: ReactNode
}

/** 結論先入眼；週次與頁碼只做定位，不搶職能層級 */
export function EditorialFrame({
  eyebrow,
  headline,
  context,
  children,
}: EditorialFrameProps) {
  return (
    <article className="editorial-page">
      <header className="editorial-header">
        <div className="editorial-meta">
          <p className="editorial-eyebrow">{eyebrow}</p>
          <p className="editorial-week">{context.weekLabel}</p>
        </div>
        <h1 className="editorial-headline">{headline}</h1>
      </header>
      <hr className="editorial-rule" />
      <div className="editorial-body">{children}</div>
    </article>
  )
}
