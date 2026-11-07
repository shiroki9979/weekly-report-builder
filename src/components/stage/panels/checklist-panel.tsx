import type { ChecklistPanel } from "@/lib/deck"

type ChecklistPanelViewProps = {
  panel: ChecklistPanel
  showTitle?: boolean
}

export function ChecklistPanelView({
  panel,
  showTitle = true,
}: ChecklistPanelViewProps) {
  return (
    <aside className="stage-panel">
      {showTitle ? <h4>{panel.title}</h4> : null}
      <ul className="stage-checklist">
        {panel.items.map((item, index) => (
          <li
            key={index}
            className={item.checked ? "checked" : undefined}
            data-testid="checklist-item"
          >
            {item.label}
          </li>
        ))}
      </ul>
    </aside>
  )
}
