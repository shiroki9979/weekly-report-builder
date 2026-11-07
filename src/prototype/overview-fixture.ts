// PROTOTYPE — 既有 Overview 的虛構文案（來自 demo/2026-01-05.json p02），用來驗證既有版型只接主題 token 是否成立
import type { OverviewPage } from "@/lib/deck"
import type { StagePageContext } from "@/lib/stage-page-context"

export const OVERVIEW_PAGE: OverviewPage = {
  id: "p02",
  layout: "overview",
  title: "Fictional cut process held, and the pilot opened.",
  lead: {
    workstream: "Platform",
    figure: "1 gate",
    result:
      "Staging and production now share one changelog checklist before promote.",
    impact: "Reviewers stopped comparing notes that lived in different docs.",
    status: { label: "On track", tone: "positive" },
  },
  supporting: [
    {
      workstream: "Forecast",
      figure: "3 sites",
      result: "Day-ahead confidence bands sit on one shared board.",
      impact: "Operators can compare sites without a side spreadsheet.",
      status: { label: "Live", tone: "positive" },
    },
    {
      workstream: "Ops",
      figure: "0 Sev-1",
      result: "On-call stayed with documentation and the dry-run cutover.",
      impact: "The week did not spend reserve on incidents.",
      status: { label: "Quiet", tone: "caution" },
    },
  ],
  notes: "",
}

export const OVERVIEW_CONTEXT: StagePageContext = {
  documentId: "prototype",
  frameLabel: "2026-01-05 — 2026-01-09",
  pageLabel: "5 / 15",
  showPageNumber: true,
}
