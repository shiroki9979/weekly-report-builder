import {
  assertCanAddEntry,
  assertCanRemoveEntry,
  CARDINALITY,
  isNextActionsPage,
  type Commitment,
  type NextActionsVariant,
  type Deck,
} from "./deck.ts"
import { moveEntry } from "./move-entry.ts"
import { typedPageUpdater } from "./update-deck-page.ts"

const updateNextActions = typedPageUpdater(
  isNextActionsPage,
  "a next-actions page"
)

export function blankCommitment(): Commitment {
  return { title: "", outcome: "", checkpoint: "" }
}

export function setNextActionsVariant(
  deck: Deck,
  pageIndex: number,
  variant: NextActionsVariant
): Deck {
  return updateNextActions(deck, pageIndex, (page) => ({ ...page, variant }))
}

export function setCommitmentField(
  deck: Deck,
  pageIndex: number,
  commitmentIndex: number,
  field: keyof Commitment,
  value: string
): Deck {
  return updateNextActions(deck, pageIndex, (page) => ({
    ...page,
    commitments: page.commitments.map((commitment, index) =>
      index === commitmentIndex ? { ...commitment, [field]: value } : commitment
    ),
  }))
}

export function addCommitment(deck: Deck, pageIndex: number): Deck {
  return updateNextActions(deck, pageIndex, (page) => {
    assertCanAddEntry(page.commitments, CARDINALITY.commitments)
    return { ...page, commitments: [...page.commitments, blankCommitment()] }
  })
}

export function removeCommitment(
  deck: Deck,
  pageIndex: number,
  commitmentIndex: number
): Deck {
  return updateNextActions(deck, pageIndex, (page) => {
    assertCanRemoveEntry(page.commitments, CARDINALITY.commitments)
    return {
      ...page,
      commitments: page.commitments.filter(
        (_, index) => index !== commitmentIndex
      ),
    }
  })
}

export function moveCommitment(
  deck: Deck,
  pageIndex: number,
  fromIndex: number,
  toIndex: number
): Deck {
  return updateNextActions(deck, pageIndex, (page) => {
    return {
      ...page,
      commitments: moveEntry(page.commitments, {
        from: fromIndex,
        to: toIndex,
      }),
    }
  })
}
