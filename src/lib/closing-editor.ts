import {
  assertCanAddEntry,
  assertCanRemoveEntry,
  CARDINALITY,
  isClosingPage,
  type ClosingPage,
  type Deck,
} from "./deck.ts"
import { typedPageUpdater } from "./update-deck-page.ts"

const updateClosing = typedPageUpdater(isClosingPage, "a Closing page")

export function setClosingFields(
  deck: Deck,
  pageIndex: number,
  fields: Partial<Pick<ClosingPage, "eyebrow" | "closingLine">>
): Deck {
  return updateClosing(deck, pageIndex, (page) => ({ ...page, ...fields }))
}

export function addTakeaway(deck: Deck, pageIndex: number): Deck {
  return updateClosing(deck, pageIndex, (page) => {
    assertCanAddEntry(page.takeaways, CARDINALITY.takeaways)
    return { ...page, takeaways: [...page.takeaways, { text: "" }] }
  })
}

export function setTakeaway(
  deck: Deck,
  pageIndex: number,
  update: { index: number; text?: string; ref?: string }
): Deck {
  const { index: takeawayIndex, ...fields } = update
  return updateClosing(deck, pageIndex, (page) => ({
    ...page,
    takeaways: page.takeaways.map((takeaway, index) =>
      index === takeawayIndex ? { ...takeaway, ...fields } : takeaway
    ),
  }))
}

export function moveTakeaway(
  deck: Deck,
  pageIndex: number,
  move: { from: number; to: number }
): Deck {
  return updateClosing(deck, pageIndex, (page) => {
    if (
      move.from < 0 ||
      move.to < 0 ||
      move.from >= page.takeaways.length ||
      move.to >= page.takeaways.length
    )
      return page
    const takeaways = [...page.takeaways]
    const [entry] = takeaways.splice(move.from, 1)
    takeaways.splice(move.to, 0, entry)
    return { ...page, takeaways }
  })
}

export function removeTakeaway(
  deck: Deck,
  pageIndex: number,
  takeawayIndex: number
): Deck {
  return updateClosing(deck, pageIndex, (page) => {
    assertCanRemoveEntry(page.takeaways, CARDINALITY.takeaways)
    return {
      ...page,
      takeaways: page.takeaways.filter((_, index) => index !== takeawayIndex),
    }
  })
}
