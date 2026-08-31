import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  addFlowStep,
  moveFlowStep,
  removeFlowStep,
  setFlowPanelTitle,
  setFlowStepCaption,
  setFlowStepLabel,
  setFlowStepVariant,
} from "@/lib/week-editor"
import type { FlowPanel, WeekDocument } from "@/lib/week-document"

type FlowEditorFormProps = {
  week: WeekDocument
  pageIndex: number
  panel: FlowPanel
  onChange: (week: WeekDocument) => void
}

export function FlowEditorForm({
  week,
  pageIndex,
  panel,
  onChange,
}: FlowEditorFormProps) {
  return (
    <fieldset className="space-y-3 rounded-md border p-3">
      <legend className="px-1 text-xs font-medium text-muted-foreground">
        Flow panel
      </legend>

      <div className="space-y-2">
        <Label htmlFor="flow-panel-title">Panel title</Label>
        <Input
          id="flow-panel-title"
          value={panel.title}
          onChange={(event) =>
            onChange(setFlowPanelTitle(week, pageIndex, event.target.value))
          }
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label>Steps</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(addFlowStep(week, pageIndex))}
          >
            Add step
          </Button>
        </div>

        {panel.steps.map((step, stepIndex) => (
          <fieldset
            key={stepIndex}
            className="space-y-2 rounded-md border border-dashed p-3"
          >
            <legend className="px-1 text-xs text-muted-foreground">
              Step {stepIndex + 1}
            </legend>
            <div className="space-y-2">
              <Label htmlFor={`flow-step-label-${stepIndex}`}>Title</Label>
              <Input
                id={`flow-step-label-${stepIndex}`}
                value={step.label}
                onChange={(event) =>
                  onChange(
                    setFlowStepLabel(
                      week,
                      pageIndex,
                      stepIndex,
                      event.target.value
                    )
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`flow-step-caption-${stepIndex}`}>Caption</Label>
              <Input
                id={`flow-step-caption-${stepIndex}`}
                value={step.caption ?? ""}
                onChange={(event) =>
                  onChange(
                    setFlowStepCaption(
                      week,
                      pageIndex,
                      stepIndex,
                      event.target.value
                    )
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`flow-step-variant-${stepIndex}`}>Variant</Label>
              <select
                id={`flow-step-variant-${stepIndex}`}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={step.variant ?? ""}
                onChange={(event) =>
                  onChange(
                    setFlowStepVariant(
                      week,
                      pageIndex,
                      stepIndex,
                      event.target.value as "default" | "ok" | ""
                    )
                  )
                }
              >
                <option value="">Default styling</option>
                <option value="default">Default</option>
                <option value="ok">OK</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={stepIndex === 0}
                onClick={() =>
                  onChange(
                    moveFlowStep(week, pageIndex, stepIndex, stepIndex - 1)
                  )
                }
              >
                Move up
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={stepIndex === panel.steps.length - 1}
                onClick={() =>
                  onChange(
                    moveFlowStep(week, pageIndex, stepIndex, stepIndex + 1)
                  )
                }
              >
                Move down
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={panel.steps.length <= 1}
                onClick={() =>
                  onChange(removeFlowStep(week, pageIndex, stepIndex))
                }
              >
                Remove
              </Button>
            </div>
          </fieldset>
        ))}
      </div>
    </fieldset>
  )
}
