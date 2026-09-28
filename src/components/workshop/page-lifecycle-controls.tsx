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
  ADDABLE_LAYOUTS,
  ADDABLE_PANEL_KINDS,
  createBlankAddablePage,
  isAddableLayout,
  isAddablePanelKind,
  nextPageId,
  type AddableLayout,
  type AddableTwoColumnPanelKind,
  type PageMoveDirection,
} from "@/lib/page-lifecycle"
import type { WeekDocument, WeekPage } from "@/lib/week-document"

type PageLifecycleControlsProps = {
  week: WeekDocument
  selectedPageId: string
  onAdd: (page: WeekPage) => void
  onDelete: (pageId: string) => void
  onMove: (pageId: string, direction: PageMoveDirection) => void
  disabled?: boolean
}

const LAYOUT_LABELS: Record<AddableLayout, string> = {
  "two-column": "Two-column",
  "weekly-overview": "Weekly Overview",
  "evidence-decision": "Evidence-backed Decision",
  "next-actions": "Next Actions",
  "trend-target": "Trend & Target",
}

const PANEL_LABELS: Record<AddableTwoColumnPanelKind, string> = {
  table: "Table",
  chart: "Chart",
  flow: "Flow",
  checklist: "Checklist",
}

export function PageLifecycleControls({
  week,
  selectedPageId,
  onAdd,
  onDelete,
  onMove,
  disabled,
}: PageLifecycleControlsProps) {
  const [layout, setLayout] = useState<AddableLayout>("two-column")
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
        <Label htmlFor="add-page-layout">Add page</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={layout}
            onValueChange={(value) => {
              if (isAddableLayout(value)) {
                setLayout(value)
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger id="add-page-layout" className="min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADDABLE_LAYOUTS.map((option) => (
                <SelectItem key={option} value={option}>
                  {LAYOUT_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {layout === "two-column" ? (
            <Select
              value={panelKind}
              onValueChange={(value) => {
                if (isAddablePanelKind(value)) {
                  setPanelKind(value)
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger
                id="add-page-panel"
                aria-label="Panel"
                className="min-w-36"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADDABLE_PANEL_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {PANEL_LABELS[kind]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => {
              const id = nextPageId(week.pages.map((page) => page.id))
              onAdd(createBlankAddablePage(id, layout, panelKind))
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
          onClick={() => onMove(selectedPageId, "up")}
        >
          Move up
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !canMoveDown}
          onClick={() => onMove(selectedPageId, "down")}
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
              onDelete(selectedPageId)
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
