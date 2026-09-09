import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { WeekDocument } from "@/lib/week-document"

type WeekPickerProps = {
  weeks: string[]
  value: string
  onChange: (monday: string) => void
  disabled?: boolean
  trailing?: ReactNode
}

export function WeekPicker({
  weeks,
  value,
  onChange,
  disabled,
  trailing,
}: WeekPickerProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="week-picker">Week</Label>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-40 flex-1">
          <Select
            value={value}
            onValueChange={(next) => {
              if (next) {
                onChange(next)
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger id="week-picker" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {weeks.map((monday) => (
                <SelectItem key={monday} value={monday}>
                  {monday}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {trailing}
      </div>
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

type WorkshopToolbarProps = {
  weeks: string[]
  selectedMonday: string
  onWeekChange: (monday: string) => void
  onSave: () => void
  saving: boolean
  saveMessage: string | null
  saveError: string | null
  suggestedMonday: string
  onCreateWeek: (monday: string) => void
  creating: boolean
  createError: string | null
  weekSelectDisabled?: boolean
  saveDisabled?: boolean
  createDisabled?: boolean
}

export function WorkshopToolbar({
  weeks,
  selectedMonday,
  onWeekChange,
  onSave,
  saving,
  saveMessage,
  saveError,
  suggestedMonday,
  onCreateWeek,
  creating,
  createError,
  weekSelectDisabled,
  saveDisabled,
  createDisabled,
}: WorkshopToolbarProps) {
  return (
    <div className="space-y-3">
      <WeekPicker
        weeks={weeks}
        value={selectedMonday}
        onChange={onWeekChange}
        disabled={weekSelectDisabled}
        trailing={
          <>
            <Button
              type="button"
              onClick={onSave}
              disabled={saveDisabled || saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
            {saveMessage ? (
              <span className="text-xs text-muted-foreground">
                {saveMessage}
              </span>
            ) : null}
            {saveError ? (
              <span className="text-xs text-destructive">{saveError}</span>
            ) : null}
          </>
        }
      />

      <NewWeekForm
        suggestedMonday={suggestedMonday}
        onCreate={onCreateWeek}
        creating={creating}
        createError={createError}
        disabled={createDisabled}
      />
    </div>
  )
}

type NewWeekFormProps = {
  suggestedMonday: string
  onCreate: (monday: string) => void
  creating: boolean
  createError: string | null
  disabled?: boolean
}

function NewWeekForm({
  suggestedMonday,
  onCreate,
  creating,
  createError,
  disabled,
}: NewWeekFormProps) {
  return (
    <NewWeekFormFields
      key={suggestedMonday}
      suggestedMonday={suggestedMonday}
      onCreate={onCreate}
      creating={creating}
      createError={createError}
      disabled={disabled}
    />
  )
}

function NewWeekFormFields({
  suggestedMonday,
  onCreate,
  creating,
  createError,
  disabled,
}: NewWeekFormProps) {
  const [monday, setMonday] = useState(suggestedMonday)

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <Label htmlFor="new-week-monday">New week (Monday)</Label>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          id="new-week-monday"
          type="date"
          className="min-w-40 flex-1"
          value={monday}
          onChange={(event) => setMonday(event.target.value)}
          disabled={disabled || creating}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || creating || monday.trim() === ""}
          onClick={() => onCreate(monday)}
        >
          {creating ? "Creating…" : "Create week"}
        </Button>
        {createError ? (
          <span className="text-xs text-destructive">{createError}</span>
        ) : null}
      </div>
    </div>
  )
}
