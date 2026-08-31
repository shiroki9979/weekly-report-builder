import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  addChecklistItem,
  removeChecklistItem,
  setChecklistItemChecked,
  setChecklistItemLabel,
  setChecklistPanelTitle,
} from "@/lib/week-editor"
import type { ChecklistPanel, WeekDocument } from "@/lib/week-document"

type ChecklistEditorFormProps = {
  week: WeekDocument
  pageIndex: number
  panel: ChecklistPanel
  onChange: (week: WeekDocument) => void
}

export function ChecklistEditorForm({
  week,
  pageIndex,
  panel,
  onChange,
}: ChecklistEditorFormProps) {
  return (
    <fieldset className="space-y-3 rounded-md border p-3">
      <legend className="px-1 text-xs font-medium text-muted-foreground">
        Checklist panel
      </legend>

      <div className="space-y-2">
        <Label htmlFor="checklist-panel-title">Panel title</Label>
        <Input
          id="checklist-panel-title"
          value={panel.title}
          onChange={(event) =>
            onChange(setChecklistPanelTitle(week, pageIndex, event.target.value))
          }
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label>Items</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(addChecklistItem(week, pageIndex))}
          >
            Add item
          </Button>
        </div>

        {panel.items.map((item, itemIndex) => (
          <div
            key={itemIndex}
            className="flex flex-col gap-2 rounded-md border border-dashed p-3 sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Checkbox
                id={`checklist-item-checked-${itemIndex}`}
                checked={item.checked ?? false}
                onCheckedChange={(checked) =>
                  onChange(
                    setChecklistItemChecked(
                      week,
                      pageIndex,
                      itemIndex,
                      checked === true
                    )
                  )
                }
              />
              <Input
                aria-label={`Checklist item ${itemIndex + 1}`}
                value={item.label}
                onChange={(event) =>
                  onChange(
                    setChecklistItemLabel(
                      week,
                      pageIndex,
                      itemIndex,
                      event.target.value
                    )
                  )
                }
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={panel.items.length <= 1}
              onClick={() =>
                onChange(removeChecklistItem(week, pageIndex, itemIndex))
              }
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    </fieldset>
  )
}
