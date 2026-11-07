import { ChartPanelView } from "@/components/stage/panels/chart-panel"
import { ChecklistPanelView } from "@/components/stage/panels/checklist-panel"
import { FlowPanelView } from "@/components/stage/panels/flow-panel"
import { TablePanelView } from "@/components/stage/panels/table-panel"
import type { Panel } from "@/lib/deck"

type StagePanelProps = {
  panel: Panel
  fullWidth?: boolean
}

function UnsupportedPanel({ kind }: { kind: string }) {
  return (
    <aside className="stage-panel">
      <p className="stage-panel-warning">Panel kind not rendered yet: {kind}</p>
    </aside>
  )
}

export function StagePanel({ panel, fullWidth = false }: StagePanelProps) {
  const showTitle = !fullWidth || panel.title.trim() !== ""
  switch (panel.kind) {
    case "table":
      return (
        <TablePanelView
          panel={panel}
          rowIndices={fullWidth}
          showTitle={showTitle}
        />
      )
    case "chart":
      return <ChartPanelView panel={panel} showTitle={showTitle} />
    case "flow":
      return <FlowPanelView panel={panel} showTitle={showTitle} />
    case "checklist":
      return <ChecklistPanelView panel={panel} showTitle={showTitle} />
    case "fields":
      return <UnsupportedPanel kind={panel.kind} />
    default:
      return <UnsupportedPanel kind="unknown" />
  }
}
