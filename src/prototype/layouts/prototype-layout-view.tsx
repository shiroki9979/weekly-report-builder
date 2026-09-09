import type { PrototypeLayout } from "@/prototype/content"
import { EvidenceDecision } from "@/prototype/layouts/evidence-decision"
import { NextActions } from "@/prototype/layouts/next-actions"
import { WeeklyOverview } from "@/prototype/layouts/weekly-overview"

type PrototypeLayoutViewProps = {
  layout: PrototypeLayout
}

export function PrototypeLayoutView({ layout }: PrototypeLayoutViewProps) {
  switch (layout.id) {
    case "weekly-overview":
      return <WeeklyOverview layout={layout} />
    case "evidence-decision":
      return <EvidenceDecision layout={layout} />
    case "next-actions":
      return <NextActions layout={layout} />
  }
}
