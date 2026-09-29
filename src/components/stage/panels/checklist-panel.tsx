import type { ChecklistPanel } from "@/lib/deck"

type ChecklistPanelViewProps = {
  panel: ChecklistPanel
}

export function ChecklistPanelView({ panel }: ChecklistPanelViewProps) {
  return (
    <aside className="stage-panel">
      <h4>{panel.title}</h4>
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
