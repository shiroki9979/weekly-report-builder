export type PrototypeLayoutId =
  "weekly-overview" | "evidence-decision" | "next-actions"

export type StatusTone = "on-track" | "improved" | "watch"

export type OverviewOutcome = {
  workstream: string
  figure: string
  result: string
  impact: string
  status: string
  tone: StatusTone
}

export type WeeklyOverviewLayout = {
  id: "weekly-overview"
  name: "Weekly Overview"
  eyebrow: string
  headline: string
  weekLabel: string
  pageNumber: string
  lead: OverviewOutcome
  supporting: [OverviewOutcome, OverviewOutcome]
}

export type ComparisonMetric = {
  label: string
  baselineLabel: string
  baselineValue: string
  baselineBarPercent: number
  candidateLabel: string
  candidateValue: string
  candidateBarPercent: number
}

export type EvidenceDecisionLayout = {
  id: "evidence-decision"
  name: "Evidence-backed Decision"
  eyebrow: string
  headline: string
  weekLabel: string
  pageNumber: string
  verdict: string
  metrics: [ComparisonMetric, ComparisonMetric]
  interpretations: [string, string]
}

export type Commitment = {
  number: string
  title: string
  outcome: string
  checkpoint: string
}

export type NextActionsLayout = {
  id: "next-actions"
  name: "Next Actions"
  eyebrow: string
  headline: string
  weekLabel: string
  pageNumber: string
  commitments: [Commitment, Commitment, Commitment]
}

export type PrototypeLayout =
  WeeklyOverviewLayout | EvidenceDecisionLayout | NextActionsLayout

/** 寫死範例稿，避免原型暗示任何生產 schema */
export const weeklyOverview: WeeklyOverviewLayout = {
  id: "weekly-overview",
  name: "Weekly Overview",
  eyebrow: "Weekly Overview",
  headline: "Delivery recovered, and the week closed with two durable gains.",
  weekLabel: "Week of 24–28 Aug",
  pageNumber: "1 / 3",
  lead: {
    workstream: "Delivery",
    figure: "5 days",
    result: "Turnaround fell from 9 days to 5.",
    impact: "Work now finishes in the same week it starts.",
    status: "On track",
    tone: "on-track",
  },
  supporting: [
    {
      workstream: "Accuracy",
      figure: "1.2%",
      result: "Faults that reached users dropped to 1.2%.",
      impact: "Fewer late fixes after something went live.",
      status: "Improved",
      tone: "improved",
    },
    {
      workstream: "Stability",
      figure: "18%",
      result: "Reserve use slowed to 18%.",
      impact: "Room remains before the next release.",
      status: "Watch",
      tone: "watch",
    },
  ],
}

export const evidenceDecision: EvidenceDecisionLayout = {
  id: "evidence-decision",
  name: "Evidence-backed Decision",
  eyebrow: "Evidence-backed Decision",
  headline: "Ship the candidate. The baseline is slower and less stable.",
  weekLabel: "Week of 24–28 Aug",
  pageNumber: "2 / 3",
  verdict: "Adopt the candidate.",
  metrics: [
    {
      label: "Turnaround",
      baselineLabel: "Baseline",
      baselineValue: "9.4 days",
      baselineBarPercent: 100,
      candidateLabel: "Candidate",
      candidateValue: "5.1 days",
      candidateBarPercent: 54,
    },
    {
      label: "Faults",
      baselineLabel: "Baseline",
      baselineValue: "4.1%",
      baselineBarPercent: 100,
      candidateLabel: "Candidate",
      candidateValue: "1.8%",
      candidateBarPercent: 44,
    },
  ],
  interpretations: [
    "Turnaround is nearly halved, so waiting no longer spans two weeks.",
    "Faults are lower, so the speed gain is not bought with instability.",
  ],
}

export const nextActions: NextActionsLayout = {
  id: "next-actions",
  name: "Next Actions",
  eyebrow: "Next Actions",
  headline: "Five-day reviews, fewer misses, and a held reserve.",
  weekLabel: "Week of 24–28 Aug",
  pageNumber: "3 / 3",
  commitments: [
    {
      number: "01",
      title: "Stabilize the review queue",
      outcome: "Changes land within five days.",
      checkpoint: "Median wait ≤ 5 days next Friday.",
    },
    {
      number: "02",
      title: "Stop the remaining misses",
      outcome: "Misses stay under 1.5%.",
      checkpoint: "Miss count reviewed on Monday.",
    },
    {
      number: "03",
      title: "Hold the reserve",
      outcome: "Use stays below 25%.",
      checkpoint: "Reserve report signed before the next release.",
    },
  ],
}

export const prototypeLayouts: PrototypeLayout[] = [
  weeklyOverview,
  evidenceDecision,
  nextActions,
]
