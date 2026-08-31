import type { FlowPanel } from "@/lib/week-document"

type FlowPanelViewProps = {
  panel: FlowPanel
}

export function FlowPanelView({ panel }: FlowPanelViewProps) {
  return (
    <aside className="stage-panel">
      <h4>{panel.title}</h4>
      <div className="stage-flow">
        {panel.steps.map((step, index) => (
          <div key={index} className="stage-flow-step-group">
            {index > 0 ? (
              <div
                className="stage-flow-arr"
                data-testid="flow-step-arrow"
                aria-hidden="true"
              >
                ↓
              </div>
            ) : null}
            <div
              className={`stage-flow-box${step.variant === "ok" ? " ok" : ""}`}
              data-testid="flow-step"
            >
              {step.label}
              {step.caption ? (
                <small className="stage-flow-cap">{step.caption}</small>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
