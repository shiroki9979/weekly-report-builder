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
import { issuePathsFor } from "@/lib/export-readiness"
import type { PanelEditorProps } from "@/components/workshop/page-editor-props"
import {
  canRemoveEntry,
  CARDINALITY,
  type ChecklistPanel,
} from "@/lib/week-document"

export function ChecklistEditorForm({
  week,
  pageIndex,
  panel,
  onChange,
}: PanelEditorProps<ChecklistPanel>) {
  const invalidPaths = issuePathsFor(week.pages[pageIndex])

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
          aria-invalid={invalidPaths.has("panel.title") || undefined}
          onChange={(event) =>
            onChange(
              setChecklistPanelTitle(week, pageIndex, event.target.value)
            )
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
                aria-invalid={
                  invalidPaths.has(`panel.items[${itemIndex}].label`) ||
                  undefined
                }
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
              disabled={
                !canRemoveEntry(panel.items, CARDINALITY.checklistItems)
              }
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
