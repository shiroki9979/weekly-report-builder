import {
  assertCanAddEntry,
  assertCanRemoveEntry,
  CARDINALITY,
  isClosingPage,
  type ClosingPage,
  type Deck,
} from "./deck.ts"
import { moveEntry, type EntryMove } from "./move-entry.ts"
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
  move: EntryMove
): Deck {
  return updateClosing(deck, pageIndex, (page) => {
    return { ...page, takeaways: moveEntry(page.takeaways, move) }
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
