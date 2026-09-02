import { useState } from "react"
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"

import { ScrollArea } from "@/components/ui/scroll-area"

type SpeakerNotesCueProps = {
  notes?: string
}

function displayNotes(notes: string | undefined): string {
  if (notes === undefined || notes.trim() === "") {
    return "No speaker notes"
  }
  return notes
}

export function SpeakerNotesCue({ notes }: SpeakerNotesCueProps) {
  const [expanded, setExpanded] = useState(true)
  const body = displayNotes(notes)

  return (
    <div className="mt-3 shrink-0 border-t pt-3">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? (
          <ChevronDownIcon className="size-3.5 shrink-0" aria-hidden />
        ) : (
          <ChevronRightIcon className="size-3.5 shrink-0" aria-hidden />
        )}
        Speaker notes
      </button>
      {expanded ? (
        <ScrollArea className="mt-2 h-36">
          <div className="pr-2 text-sm whitespace-pre-wrap text-foreground">
            {body}
          </div>
        </ScrollArea>
      ) : null}
    </div>
  )
}
