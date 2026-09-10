import { useEffect, useId, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  addPageAfter,
  createBlankTwoColumnPage,
  deleteSelectedPage,
  moveSelectedPage,
  nextPageId,
  type AddableTwoColumnPanelKind,
  type PageLifecycleResult,
} from "@/lib/page-lifecycle"
import type { WeekDocument } from "@/lib/week-document"

type PageLifecycleControlsProps = {
  week: WeekDocument
  selectedPageId: string
  onChange: (result: PageLifecycleResult) => void
  disabled?: boolean
}

const PANEL_OPTIONS: { value: AddableTwoColumnPanelKind; label: string }[] = [
  { value: "table", label: "Table" },
  { value: "chart", label: "Chart" },
  { value: "flow", label: "Flow" },
  { value: "checklist", label: "Checklist" },
]

export function PageLifecycleControls({
  week,
  selectedPageId,
  onChange,
  disabled,
}: PageLifecycleControlsProps) {
  const [panelKind, setPanelKind] = useState<AddableTwoColumnPanelKind>("table")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const selectedIndex = week.pages.findIndex(
    (page) => page.id === selectedPageId
  )
  const selectedPage = week.pages[selectedIndex]
  const canMoveUp = selectedIndex > 0
  const canMoveDown =
    selectedIndex >= 0 && selectedIndex < week.pages.length - 1
  const canDelete = week.pages.length > 1

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }
    if (deleteOpen) {
      if (!dialog.open) {
        // jsdom 未實作 HTMLDialogElement.showModal，瀏覽器仍走原生 modal
        if (typeof dialog.showModal === "function") {
          dialog.showModal()
        } else {
          dialog.setAttribute("open", "")
        }
      }
      return
    }
    if (dialog.open) {
      if (typeof dialog.close === "function") {
        dialog.close()
      } else {
        dialog.removeAttribute("open")
      }
    }
  }, [deleteOpen])

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="add-page-panel">Add page</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={panelKind}
            onValueChange={(value) => {
              if (
                value === "table" ||
                value === "chart" ||
                value === "flow" ||
                value === "checklist"
              ) {
                setPanelKind(value)
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger id="add-page-panel" className="min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PANEL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  Two-column · {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => {
              const id = nextPageId(week.pages.map((page) => page.id))
              onChange(
                addPageAfter(
                  week,
                  selectedPageId,
                  createBlankTwoColumnPage(id, panelKind)
                )
              )
            }}
          >
            Add page
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !canMoveUp}
          onClick={() => onChange(moveSelectedPage(week, selectedPageId, "up"))}
        >
          Move up
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !canMoveDown}
          onClick={() =>
            onChange(moveSelectedPage(week, selectedPageId, "down"))
          }
        >
          Move down
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={disabled || !canDelete}
          onClick={() => setDeleteOpen(true)}
        >
          Delete page
        </Button>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="w-full max-w-md space-y-3 rounded-md border bg-background p-4 text-foreground shadow-lg"
        onClose={() => setDeleteOpen(false)}
      >
        <p id={titleId} className="text-sm font-medium">
          Delete this page?
        </p>
        {selectedPage ? (
          <p className="text-sm text-muted-foreground">
            {selectedPage.title || selectedPage.id} · {selectedPage.layout}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              onChange(deleteSelectedPage(week, selectedPageId))
              setDeleteOpen(false)
            }}
          >
            Delete
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDeleteOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </dialog>
    </div>
  )
}
