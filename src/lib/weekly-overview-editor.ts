import {
  isWeeklyOverviewPage,
  type Outcome,
  type StatusTone,
  type WeekDocument,
  type WeekPage,
  type WeeklyOverviewPage,
} from "./week-document"

type OutcomeTextField = "workstream" | "figure" | "result" | "impact"
type StatusField = "label" | "tone"

const STATUS_TONES = new Set<StatusTone>(["positive", "caution", "neutral"])

function cloneWeek(week: WeekDocument): WeekDocument {
  return structuredClone(week)
}

function requireOverview(
  page: WeekPage,
  pageIndex: number
): WeeklyOverviewPage {
  if (!isWeeklyOverviewPage(page)) {
    throw new Error(`Page ${pageIndex} is not a weekly-overview page`)
  }

  return page
}

function updateOverview(
  week: WeekDocument,
  pageIndex: number,
  updater: (page: WeeklyOverviewPage) => WeeklyOverviewPage
): WeekDocument {
  const next = cloneWeek(week)
  const page = next.pages[pageIndex]
  if (!page) {
    throw new Error(`Page index out of range: ${pageIndex}`)
  }

  next.pages[pageIndex] = updater(requireOverview(page, pageIndex))
  return next
}

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
    if (!STATUS_TONES.has(value as StatusTone)) {
      throw new Error(`Invalid status tone: ${value}`)
    }

    return {
      ...outcome,
      status: { ...outcome.status, tone: value as StatusTone },
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
    if (page.supporting.length >= 3) {
      throw new Error("Weekly Overview can have at most 3 supporting outcomes")
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
    if (page.supporting.length <= 1) {
      throw new Error("Weekly Overview must keep at least 1 supporting outcome")
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
