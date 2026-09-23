import { useState } from "react"
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"

import { ScrollArea } from "@/components/ui/scroll-area"

type SpeakerNotesCueProps = {
  notes?: string
  /** 有傳時由外層 panel 決定展開，按鈕負責收合面板而不只是藏文字 */
  expanded?: boolean
  onToggle?: () => void
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
}: SpeakerNotesCueProps) {
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(true)
  const isExpanded = onToggle ? expanded !== false : uncontrolledExpanded
  const body = displayNotes(notes)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden pt-2">
      <button
        type="button"
        className="flex w-full shrink-0 items-center gap-1.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={isExpanded}
        onClick={() => {
          if (onToggle) {
            onToggle()
            return
          }
          setUncontrolledExpanded((value) => !value)
        }}
      >
        {isExpanded ? (
          <ChevronDownIcon className="size-3.5 shrink-0" aria-hidden />
        ) : (
          <ChevronRightIcon className="size-3.5 shrink-0" aria-hidden />
        )}
        Speaker notes
      </button>
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
