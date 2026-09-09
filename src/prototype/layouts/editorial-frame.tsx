import type { ReactNode } from "react"

type EditorialFrameProps = {
  eyebrow: string
  headline: string
  weekLabel: string
  pageNumber: string
  children: ReactNode
}

/** 三頁共用外框：溝通職能與結論先入眼，週次與頁碼只做定位 */
export function EditorialFrame({
  eyebrow,
  headline,
  weekLabel,
  pageNumber,
  children,
}: EditorialFrameProps) {
  return (
    <article className="proto-page">
      <header className="proto-header">
        <div className="proto-meta">
          <p className="proto-eyebrow">{eyebrow}</p>
          <p className="proto-week">{weekLabel}</p>
        </div>
        <h1 className="proto-headline">{headline}</h1>
      </header>
      <hr className="proto-rule" />
      <div className="proto-body">{children}</div>
      <footer className="proto-page-number">{pageNumber}</footer>
    </article>
  )
}
