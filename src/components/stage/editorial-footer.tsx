import { formatPagePosition, type PagePosition } from "@/lib/stage-page-context"

type EditorialFooterProps = {
  deckTitle?: string
  position: PagePosition | null
}

/** Editorial Frame 與 HTML Page 共用同一份頁尾，主題樣式才會一次套到兩者 */
export function EditorialFooter({ deckTitle, position }: EditorialFooterProps) {
  const paddedLabel = position
    ? `${position.index.toString().padStart(2, "0")} / ${position.total.toString().padStart(2, "0")}`
    : null

  return (
    <footer
      className="editorial-page-number"
      aria-hidden={!deckTitle && !position ? true : undefined}
    >
      {deckTitle ? (
        <span className="editorial-deck-title">{deckTitle}</span>
      ) : null}
      {position ? (
        <span className="editorial-page-label">
          <span className="editorial-number-default">
            {formatPagePosition(position)}
          </span>
          <span className="editorial-number-padded">{paddedLabel}</span>
        </span>
      ) : null}
      {!deckTitle && !position ? " " : null}
    </footer>
  )
}
