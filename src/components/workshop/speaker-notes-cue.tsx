import { useState } from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PanelBottomIcon,
  PanelRightIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type SpeakerNotesCueProps = {
  notes?: string
  /** 有傳時由外層 panel 決定展開，按鈕負責收合面板而不只是藏文字 */
  expanded?: boolean
  onToggle?: () => void
  position?: "bottom" | "right"
  onTogglePosition?: () => void
}

function displayNotes(notes: string | undefined): string {
  if (notes === undefined || notes.trim() === "") {
    return "No speaker notes"
  }
  return notes
}

export function SpeakerNotesCue({
  notes,
  expanded,
  onToggle,
  position = "bottom",
  onTogglePosition,
}: SpeakerNotesCueProps) {
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(true)
  const isExpanded = onToggle ? expanded !== false : uncontrolledExpanded
  const body = displayNotes(notes)
  const collapsedOnRight = position === "right" && !isExpanded
  const CollapseIcon = position === "right" ? ChevronRightIcon : ChevronDownIcon
  const ExpandIcon = position === "right" ? ChevronLeftIcon : ChevronRightIcon
  const ToggleIcon = isExpanded ? CollapseIcon : ExpandIcon
  const positionLabel =
    position === "bottom" ? "Move notes to right" : "Move notes below slide"

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden pt-2",
        position === "right" && "pl-2"
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center gap-1",
          collapsedOnRight && "flex-col-reverse gap-3"
        )}
      >
        <button
          type="button"
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 rounded-sm text-left text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
            collapsedOnRight && "flex-none flex-col"
          )}
          aria-expanded={isExpanded}
          title={isExpanded ? "Collapse speaker notes" : "Expand speaker notes"}
          onClick={() => {
            if (onToggle) {
              onToggle()
              return
            }
            setUncontrolledExpanded((value) => !value)
          }}
        >
          <ToggleIcon className="size-3.5 shrink-0" aria-hidden />
          <span
            className={cn(collapsedOnRight && "[writing-mode:vertical-rl]")}
          >
            Speaker notes
          </span>
        </button>
        {onTogglePosition ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={positionLabel}
            title={positionLabel}
            onClick={onTogglePosition}
          >
            {position === "bottom" ? <PanelRightIcon /> : <PanelBottomIcon />}
          </Button>
        ) : null}
      </div>
      {isExpanded ? (
        <ScrollArea className="mt-2 min-h-0 flex-1">
          <div className="pr-2 text-sm whitespace-pre-wrap text-foreground">
            {body}
          </div>
        </ScrollArea>
      ) : null}
    </div>
  )
}
