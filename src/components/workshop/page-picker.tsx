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

              return page.hidden ? `${page.title} (hidden)` : page.title
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {week.pages.map((page, index) => (
            <SelectItem key={page.id} value={String(index)}>
              {page.hidden ? `${page.title} (hidden)` : page.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
