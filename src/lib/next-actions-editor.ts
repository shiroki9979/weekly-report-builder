import {
  canAddEntry,
  canRemoveEntry,
  CARDINALITY,
  isNextActionsPage,
  type Commitment,
  type WeekDocument,
} from "./week-document"
import { typedPageUpdater } from "./update-week-page"

const updateNextActions = typedPageUpdater(
  isNextActionsPage,
  "a next-actions page"
)

export function blankCommitment(): Commitment {
  return { title: "", outcome: "", checkpoint: "" }
}

export function setCommitmentField(
  week: WeekDocument,
  pageIndex: number,
  commitmentIndex: number,
  field: keyof Commitment,
  value: string
): WeekDocument {
  return updateNextActions(week, pageIndex, (page) => ({
    ...page,
    commitments: page.commitments.map((commitment, index) =>
      index === commitmentIndex ? { ...commitment, [field]: value } : commitment
    ),
  }))
}

export function addCommitment(
  week: WeekDocument,
  pageIndex: number
): WeekDocument {
  return updateNextActions(week, pageIndex, (page) => {
    if (!canAddEntry(page.commitments, CARDINALITY.commitments)) {
      throw new Error(
        `Next Actions can have at most ${CARDINALITY.commitments.max} commitments`
      )
    }
    return { ...page, commitments: [...page.commitments, blankCommitment()] }
  })
}

export function removeCommitment(
  week: WeekDocument,
  pageIndex: number,
  commitmentIndex: number
): WeekDocument {
  return updateNextActions(week, pageIndex, (page) => {
    if (!canRemoveEntry(page.commitments, CARDINALITY.commitments)) {
      throw new Error(
        `Next Actions must keep at least ${CARDINALITY.commitments.min} commitments`
      )
    }
    return {
      ...page,
      commitments: page.commitments.filter(
        (_, index) => index !== commitmentIndex
      ),
    }
  })
}

export function moveCommitment(
  week: WeekDocument,
  pageIndex: number,
  fromIndex: number,
  toIndex: number
): WeekDocument {
  return updateNextActions(week, pageIndex, (page) => {
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= page.commitments.length ||
      toIndex >= page.commitments.length
    ) {
      return page
    }
    const commitments = [...page.commitments]
    const [entry] = commitments.splice(fromIndex, 1)
    commitments.splice(toIndex, 0, entry)
    return { ...page, commitments }
  })
}
