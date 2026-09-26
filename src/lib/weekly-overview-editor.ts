import {
  canAddEntry,
  canRemoveEntry,
  CARDINALITY,
  isStatusTone,
  isWeeklyOverviewPage,
  type Outcome,
  type WeekDocument,
} from "./week-document"
import { typedPageUpdater } from "./update-week-page"

type OutcomeTextField = "workstream" | "figure" | "result" | "impact"
type StatusField = "label" | "tone"

const updateOverview = typedPageUpdater(
  isWeeklyOverviewPage,
  "a weekly-overview page"
)

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
  week: WeekDocument,
  pageIndex: number,
  field: OutcomeTextField,
  value: string
): WeekDocument {
  return updateOverview(week, pageIndex, (page) => ({
    ...page,
    lead: updateOutcomeText(page.lead, field, value),
  }))
}

export function setOverviewLeadStatus(
  week: WeekDocument,
  pageIndex: number,
  field: StatusField,
  value: string
): WeekDocument {
  return updateOverview(week, pageIndex, (page) => ({
    ...page,
    lead: updateOutcomeStatus(page.lead, field, value),
  }))
}

export function setOverviewSupportingField(
  week: WeekDocument,
  pageIndex: number,
  supportingIndex: number,
  field: OutcomeTextField,
  value: string
): WeekDocument {
  return updateOverview(week, pageIndex, (page) => ({
    ...page,
    supporting: page.supporting.map((entry, index) =>
      index === supportingIndex ? updateOutcomeText(entry, field, value) : entry
    ),
  }))
}

export function setOverviewSupportingStatus(
  week: WeekDocument,
  pageIndex: number,
  supportingIndex: number,
  field: StatusField,
  value: string
): WeekDocument {
  return updateOverview(week, pageIndex, (page) => ({
    ...page,
    supporting: page.supporting.map((entry, index) =>
      index === supportingIndex
        ? updateOutcomeStatus(entry, field, value)
        : entry
    ),
  }))
}

export function addSupportingOutcome(
  week: WeekDocument,
  pageIndex: number
): WeekDocument {
  return updateOverview(week, pageIndex, (page) => {
    if (!canAddEntry(page.supporting, CARDINALITY.supportingOutcomes)) {
      throw new Error(
        `Weekly Overview can have at most ${CARDINALITY.supportingOutcomes.max} supporting outcomes`
      )
    }

    return {
      ...page,
      supporting: [...page.supporting, blankOutcome()],
    }
  })
}

export function removeSupportingOutcome(
  week: WeekDocument,
  pageIndex: number,
  supportingIndex: number
): WeekDocument {
  return updateOverview(week, pageIndex, (page) => {
    if (!canRemoveEntry(page.supporting, CARDINALITY.supportingOutcomes)) {
      throw new Error(
        `Weekly Overview must keep at least ${CARDINALITY.supportingOutcomes.min} supporting outcome`
      )
    }

    return {
      ...page,
      supporting: page.supporting.filter(
        (_, index) => index !== supportingIndex
      ),
    }
  })
}

export function moveSupportingOutcome(
  week: WeekDocument,
  pageIndex: number,
  fromIndex: number,
  toIndex: number
): WeekDocument {
  return updateOverview(week, pageIndex, (page) => {
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
  week: WeekDocument,
  pageIndex: number,
  supportingIndex: number
): WeekDocument {
  return updateOverview(week, pageIndex, (page) => {
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
