import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { WeekDocument } from "@/lib/week-document"

type WeekPickerProps = {
  weeks: string[]
  value: string
  onChange: (monday: string) => void
  disabled?: boolean
}

export function WeekPicker({ weeks, value, onChange, disabled }: WeekPickerProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="week-picker">Week</Label>
      <select
        id="week-picker"
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        {weeks.map((monday) => (
          <option key={monday} value={monday}>
            {monday}
          </option>
        ))}
      </select>
    </div>
  )
}

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
      <select
        id="page-picker"
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        value={String(selectedPageIndex)}
        onChange={(event) => onSelect(Number(event.target.value))}
      >
        {week.pages.map((page, index) => (
          <option key={page.id} value={index}>
            {page.hidden ? `${page.title} (hidden)` : page.title}
          </option>
        ))}
      </select>
    </div>
  )
}

type WorkshopToolbarProps = {
  weeks: string[]
  selectedMonday: string
  onWeekChange: (monday: string) => void
  onSave: () => void
  saving: boolean
  saveMessage: string | null
  saveError: string | null
  disabled?: boolean
}

export function WorkshopToolbar({
  weeks,
  selectedMonday,
  onWeekChange,
  onSave,
  saving,
  saveMessage,
  saveError,
  disabled,
}: WorkshopToolbarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-40 flex-1">
        <WeekPicker
          weeks={weeks}
          value={selectedMonday}
          onChange={onWeekChange}
          disabled={disabled}
        />
      </div>
      <Button type="button" onClick={onSave} disabled={disabled || saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
      {saveMessage ? (
        <span className="text-xs text-muted-foreground">{saveMessage}</span>
      ) : null}
      {saveError ? (
        <span className="text-xs text-destructive">{saveError}</span>
      ) : null}
    </div>
  )
}
