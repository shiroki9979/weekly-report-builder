import {
  assertCanAddEntry,
  assertCanRemoveEntry,
  CARDINALITY,
  isStatusTone,
  isOverviewPage,
  type Outcome,
  type Deck,
} from "./deck"
import { typedPageUpdater } from "./update-deck-page"

type OutcomeTextField = "workstream" | "figure" | "result" | "impact"
type StatusField = "label" | "tone"

const updateOverview = typedPageUpdater(isOverviewPage, "an overview page")

export function blankOutcome(): Outcome {
  return {
    workstream: "",
    figure: "",
    result: "",
    impact: "",
    status: { label: "", tone: "neutral" },
  }
}

function updateOutcomeText(
  outcome: Outcome,
  field: OutcomeTextField,
  value: string
): Outcome {
  return { ...outcome, [field]: value }
}

function updateOutcomeStatus(
  outcome: Outcome,
  field: StatusField,
  value: string
): Outcome {
  if (field === "tone") {
    if (!isStatusTone(value)) {
      throw new Error(`Invalid status tone: ${value}`)
    }

    return {
      ...outcome,
      status: { ...outcome.status, tone: value },
    }
  }

  return {
    ...outcome,
    status: { ...outcome.status, label: value },
  }
}

export function setOverviewLeadField(
  deck: Deck,
  pageIndex: number,
  field: OutcomeTextField,
  value: string
): Deck {
  return updateOverview(deck, pageIndex, (page) => ({
    ...page,
    lead: updateOutcomeText(page.lead, field, value),
  }))
}

export function setOverviewLeadStatus(
  deck: Deck,
  pageIndex: number,
  field: StatusField,
  value: string
): Deck {
  return updateOverview(deck, pageIndex, (page) => ({
    ...page,
    lead: updateOutcomeStatus(page.lead, field, value),
  }))
}

export function setOverviewSupportingField(
  deck: Deck,
  pageIndex: number,
  supportingIndex: number,
  field: OutcomeTextField,
  value: string
): Deck {
  return updateOverview(deck, pageIndex, (page) => ({
    ...page,
    supporting: page.supporting.map((entry, index) =>
      index === supportingIndex ? updateOutcomeText(entry, field, value) : entry
    ),
  }))
}

export function setOverviewSupportingStatus(
  deck: Deck,
  pageIndex: number,
  supportingIndex: number,
  field: StatusField,
  value: string
): Deck {
  return updateOverview(deck, pageIndex, (page) => ({
    ...page,
    supporting: page.supporting.map((entry, index) =>
      index === supportingIndex
        ? updateOutcomeStatus(entry, field, value)
        : entry
    ),
  }))
}

export function addSupportingOutcome(deck: Deck, pageIndex: number): Deck {
  return updateOverview(deck, pageIndex, (page) => {
    assertCanAddEntry(page.supporting, CARDINALITY.supportingOutcomes)

    return {
      ...page,
      supporting: [...page.supporting, blankOutcome()],
    }
  })
}

export function removeSupportingOutcome(
  deck: Deck,
  pageIndex: number,
  supportingIndex: number
): Deck {
  return updateOverview(deck, pageIndex, (page) => {
    assertCanRemoveEntry(page.supporting, CARDINALITY.supportingOutcomes)

    return {
      ...page,
      supporting: page.supporting.filter(
        (_, index) => index !== supportingIndex
      ),
    }
  })
}

export function moveSupportingOutcome(
  deck: Deck,
  pageIndex: number,
  fromIndex: number,
  toIndex: number
): Deck {
  return updateOverview(deck, pageIndex, (page) => {
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= page.supporting.length ||
      toIndex >= page.supporting.length
    ) {
      return page
    }

    const supporting = [...page.supporting]
    const [entry] = supporting.splice(fromIndex, 1)
    supporting.splice(toIndex, 0, entry)

    return { ...page, supporting }
  })
}

export function makeLead(
  deck: Deck,
  pageIndex: number,
  supportingIndex: number
): Deck {
  return updateOverview(deck, pageIndex, (page) => {
    const supportingEntry = page.supporting[supportingIndex]
    if (!supportingEntry) {
      throw new Error(`Unknown supporting outcome: ${supportingIndex}`)
    }

    const supporting = [...page.supporting]
    supporting[supportingIndex] = page.lead

    return {
      ...page,
      lead: supportingEntry,
      supporting,
    }
  })
}
