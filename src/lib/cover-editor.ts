import { isCoverPage, type CoverPage, type Deck } from "./deck.ts"
import { typedPageUpdater } from "./update-deck-page.ts"

const updateCover = typedPageUpdater(isCoverPage, "a Cover page")

export function setCoverFields(
  deck: Deck,
  pageIndex: number,
  fields: Partial<Pick<CoverPage, "subtitle" | "byline">>
): Deck {
  return updateCover(deck, pageIndex, (page) => ({ ...page, ...fields }))
}
