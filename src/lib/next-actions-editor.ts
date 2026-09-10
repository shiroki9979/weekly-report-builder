import {
  isNextActionsPage,
  type Commitment,
  type NextActionsPage,
  type WeekDocument,
  type WeekPage,
} from "./week-document"

function cloneWeek(week: WeekDocument): WeekDocument {
  return structuredClone(week)
}

function requireNextActions(
  page: WeekPage,
  pageIndex: number
): NextActionsPage {
  if (!isNextActionsPage(page)) {
    throw new Error(`Page ${pageIndex} is not a next-actions page`)
  }
  return page
}

function updateNextActions(
  week: WeekDocument,
  pageIndex: number,
  updater: (page: NextActionsPage) => NextActionsPage
): WeekDocument {
  const next = cloneWeek(week)
  const page = next.pages[pageIndex]
  if (!page) {
    throw new Error(`Page index out of range: ${pageIndex}`)
  }
  next.pages[pageIndex] = updater(requireNextActions(page, pageIndex))
  return next
}

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
    if (page.commitments.length >= 4) {
      throw new Error("Next Actions can have at most 4 commitments")
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
    if (page.commitments.length <= 2) {
      throw new Error("Next Actions must keep at least 2 commitments")
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
