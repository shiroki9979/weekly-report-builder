import {
  assertCanAddEntry,
  assertCanRemoveEntry,
  CARDINALITY,
  isSideBySidePage,
  type ComparisonColumn,
  type ComparisonColumnIndex,
  type Deck,
  type SideBySidePage,
} from "./deck.ts"
import { moveEntry } from "./move-entry.ts"
import { typedPageUpdater } from "./update-deck-page.ts"

const updateComparison = typedPageUpdater(
  isSideBySidePage,
  "a Side-by-side Comparison page"
)

export function setComparisonColumn(
  deck: Deck,
  pageIndex: number,
  update: { column: ComparisonColumnIndex; label: string }
): Deck {
  return updateComparison(deck, pageIndex, (page) => {
    return replaceColumn(page, update.column, {
      ...page.columns[update.column],
      label: update.label,
    })
  })
}

export function addComparisonPoint(
  deck: Deck,
  pageIndex: number,
  column: ComparisonColumnIndex
): Deck {
  return updateComparison(deck, pageIndex, (page) => {
    const current = page.columns[column]
    assertCanAddEntry(current.points, CARDINALITY.sideBySidePoints)
    return replaceColumn(page, column, {
      ...current,
      points: [...current.points, ""],
    })
  })
}

export function setComparisonPoint(
  deck: Deck,
  pageIndex: number,
  update: { column: ComparisonColumnIndex; point: number; text: string }
): Deck {
  return updateComparison(deck, pageIndex, (page) => {
    const current = page.columns[update.column]
    const points = current.points.map((point, index) =>
      index === update.point ? update.text : point
    )
    return replaceColumn(page, update.column, { ...current, points })
  })
}

export function moveComparisonPoint(
  deck: Deck,
  pageIndex: number,
  move: { column: ComparisonColumnIndex; from: number; to: number }
): Deck {
  return updateComparison(deck, pageIndex, (page) => {
    const current = page.columns[move.column]
    const points = moveEntry(current.points, move)
    return replaceColumn(page, move.column, { ...current, points })
  })
}

export function removeComparisonPoint(
  deck: Deck,
  pageIndex: number,
  location: { column: ComparisonColumnIndex; point: number }
): Deck {
  return updateComparison(deck, pageIndex, (page) => {
    const current = page.columns[location.column]
    assertCanRemoveEntry(current.points, CARDINALITY.sideBySidePoints)
    const points = current.points.filter((_, index) => index !== location.point)
    return replaceColumn(page, location.column, { ...current, points })
  })
}

export function setComparisonChosen(
  deck: Deck,
  pageIndex: number,
  chosen: ComparisonColumnIndex | undefined
): Deck {
  return updateComparison(deck, pageIndex, (page) => ({ ...page, chosen }))
}

export function setComparisonTradeoff(
  deck: Deck,
  pageIndex: number,
  tradeoff: SideBySidePage["tradeoff"]
): Deck {
  return updateComparison(deck, pageIndex, (page) => ({ ...page, tradeoff }))
}

function replaceColumn(
  page: SideBySidePage,
  index: ComparisonColumnIndex,
  column: ComparisonColumn
): SideBySidePage {
  const columns: SideBySidePage["columns"] = [...page.columns]
  columns[index] = column
  return { ...page, columns }
}
