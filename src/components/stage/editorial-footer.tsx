import {
  formatPagePosition,
  padPageNumber,
  type StageFooter,
} from "@/lib/stage-page-context"

/** Editorial Frame、Cover 與 HTML Page 共用同一份頁尾，主題樣式才會一次套到三者 */
export function EditorialFooter({ deckTitle, position }: StageFooter) {
  const paddedLabel = position
    ? `${padPageNumber(position.index)} / ${padPageNumber(position.total)}`
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
