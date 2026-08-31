import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { WeekPage } from "@/lib/week-document"

type PageNavigatorProps = {
  pages: WeekPage[]
  selectedPageIndex: number
  onSelect: (index: number) => void
  disabled?: boolean
}

export function PageNavigator({
  pages,
  selectedPageIndex,
  onSelect,
  disabled,
}: PageNavigatorProps) {
  if (pages.length === 0) {
    return null
  }

  const page = pages[selectedPageIndex]
  const canGoPrev = selectedPageIndex > 0
  const canGoNext = selectedPageIndex < pages.length - 1
  const title = page
    ? page.hidden
      ? `${page.title || page.id} (hidden)`
      : page.title || page.id
    : ""

  return (
    <nav
      aria-label="Page navigator"
      className="flex shrink-0 items-center gap-2 border-t pt-3"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Previous page"
        disabled={disabled || !canGoPrev}
        onClick={() => onSelect(selectedPageIndex - 1)}
      >
        <ChevronLeftIcon />
      </Button>

      <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
        <div className="flex max-w-full items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {selectedPageIndex + 1} / {pages.length}
          </span>
          <span aria-hidden>·</span>
          <span className="truncate font-medium text-foreground">{title}</span>
          {page?.id ? (
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {page.id}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5" role="group" aria-label="Pages">
          {pages.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              aria-label={`Go to page ${index + 1}${entry.hidden ? " (hidden)" : ""}`}
              aria-current={index === selectedPageIndex ? "page" : undefined}
              disabled={disabled}
              className={
                index === selectedPageIndex
                  ? "size-1.5 rounded-full bg-foreground disabled:opacity-50"
                  : entry.hidden
                    ? "size-1.5 rounded-full bg-muted-foreground/30 disabled:opacity-50"
                    : "size-1.5 rounded-full bg-muted-foreground/50 hover:bg-muted-foreground disabled:opacity-50"
              }
              onClick={() => onSelect(index)}
            />
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground">← → to switch pages</p>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Next page"
        disabled={disabled || !canGoNext}
        onClick={() => onSelect(selectedPageIndex + 1)}
      >
        <ChevronRightIcon />
      </Button>
    </nav>
  )
}
