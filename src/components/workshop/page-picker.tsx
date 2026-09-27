import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { WeekDocument } from "@/lib/week-document"

type PagePickerProps = {
  week: WeekDocument
  selectedPageIndex: number
  onSelect: (index: number) => void
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

              const label = page.title.trim() || page.id
              return page.hidden ? `${label} (hidden)` : label
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {week.pages.map((page, index) => (
            <SelectItem key={page.id} value={String(index)}>
              {page.hidden
                ? `${page.title.trim() || page.id} (hidden)`
                : page.title.trim() || page.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
