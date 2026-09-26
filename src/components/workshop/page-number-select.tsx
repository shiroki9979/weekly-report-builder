import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  defaultPageNumberVisibility,
  type WeekDocument,
} from "@/lib/week-document"
import { setPageShowPageNumber } from "@/lib/week-editor"

type PageNumberSelectProps = {
  week: WeekDocument
  pageIndex: number
  disabled?: boolean
  onChange: (week: WeekDocument) => void
}

/** 頁面級頁碼顯示設定（可繼承週層級預設，或單獨強制顯示／隱藏） */
export function PageNumberSelect({
  week,
  pageIndex,
  disabled = false,
  onChange,
}: PageNumberSelectProps) {
  const page = week.pages[pageIndex]
  const defaultVisible = page ? defaultPageNumberVisibility(week, page) : true
  const currentValue =
    page?.showPageNumber === undefined
      ? "default"
      : page.showPageNumber
        ? "show"
        : "hide"

  const defaultLabel = defaultVisible ? "Default (Show)" : "Default (Hide)"

  return (
    <div className={cn("space-y-2", disabled && "opacity-50")}>
      <Label
        htmlFor="page-number-visibility"
        className={
          disabled ? "cursor-not-allowed text-muted-foreground" : undefined
        }
      >
        Page number
      </Label>
      <Select
        value={currentValue}
        disabled={disabled}
        onValueChange={(val) => {
          let next: boolean | undefined
          if (val === "show") {
            next = true
          } else if (val === "hide") {
            next = false
          } else {
            next = undefined
          }
          onChange(setPageShowPageNumber(week, pageIndex, next))
        }}
      >
        <SelectTrigger id="page-number-visibility" className="w-full">
          <SelectValue>
            {(value: string | null) => {
              if (value === "show") {
                return "Show"
              }
              if (value === "hide") {
                return "Hide"
              }
              return defaultLabel
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">{defaultLabel}</SelectItem>
          <SelectItem value="show">Show</SelectItem>
          <SelectItem value="hide">Hide</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
