import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  addFlowStep,
  moveFlowStep,
  removeFlowStep,
  setFlowPanelTitle,
  setFlowStepCaption,
  setFlowStepLabel,
  setFlowStepVariant,
} from "@/lib/week-editor"
import { issuePathsFor } from "@/lib/export-readiness"
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
  const invalidPaths = issuePathsFor(week.pages[pageIndex])

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
          aria-invalid={invalidPaths.has("panel.title") || undefined}
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
                aria-invalid={
                  invalidPaths.has(`panel.steps[${stepIndex}].label`) ||
                  undefined
                }
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
              <Select
                value={step.variant ?? ""}
                onValueChange={(next) => {
                  if (next === null) {
                    return
                  }

                  onChange(
                    setFlowStepVariant(
                      week,
                      pageIndex,
                      stepIndex,
                      next as "default" | "ok" | ""
                    )
                  )
                }}
              >
                <SelectTrigger
                  id={`flow-step-variant-${stepIndex}`}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Default styling</SelectItem>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="ok">OK</SelectItem>
                </SelectContent>
              </Select>
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
