import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { WeekDocument, WeekPage } from "@/lib/week-document"

type PagePickerProps = {
  week: WeekDocument
  selectedPageIndex: number
  onSelect: (index: number) => void
}

// clone 後的新週會清空標題；以 Page ID 代替，避免下拉選單出現無名稱的選項
function pageOptionLabel(page: WeekPage): string {
  const label = page.title.trim() || page.id
  return page.hidden ? `${label} (hidden)` : label
}

export function PagePicker({
  week,
  selectedPageIndex,
  onSelect,
}: PagePickerProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="page-picker">Page</Label>
      <Select
        value={String(selectedPageIndex)}
        onValueChange={(next) => {
          if (next) {
            onSelect(Number(next))
          }
        }}
      >
        <SelectTrigger id="page-picker" className="w-full">
          <SelectValue>
            {(value: string | null) => {
              if (value == null) {
                return null
              }

              const page = week.pages[Number(value)]
              if (!page) {
                return value
              }

              return pageOptionLabel(page)
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {week.pages.map((page, index) => (
            <SelectItem key={page.id} value={String(index)}>
              {pageOptionLabel(page)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
