import { ChartPanelView } from "@/components/stage/panels/chart-panel"
import { TablePanelView } from "@/components/stage/panels/table-panel"
import type { Panel } from "@/lib/week-document"

type StagePanelProps = {
  panel: Panel
}

function UnsupportedPanel({ kind }: { kind: string }) {
  return (
    <aside className="stage-panel">
      <p className="stage-panel-warning">Panel kind not rendered yet: {kind}</p>
    </aside>
  )
}

export function StagePanel({ panel }: StagePanelProps) {
  switch (panel.kind) {
    case "table":
      return <TablePanelView panel={panel} />
    case "chart":
      return <ChartPanelView panel={panel} />
    case "flow":
    case "checklist":
    case "fields":
      return <UnsupportedPanel kind={panel.kind} />
    default:
      return <UnsupportedPanel kind="unknown" />
  }
}
