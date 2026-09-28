import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

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

export type ToolbarSaveControls = {
  onSave: () => void
  saving: boolean
  message: string | null
  error: string | null
  disabled?: boolean
}

export type ToolbarCreateControls = {
  onCreate: (monday: string) => void
  creating: boolean
  error: string | null
  suggestedMonday: string
  disabled?: boolean
}

export type ToolbarPageNumberControls = {
  show: boolean
  onChange?: (show: boolean) => void
  disabled?: boolean
}

type WorkshopToolbarProps = {
  weeks: string[]
  selectedMonday: string
  onWeekChange: (monday: string) => void
  weekSelectDisabled?: boolean
  save: ToolbarSaveControls
  create: ToolbarCreateControls
  pageNumbers?: ToolbarPageNumberControls
}

export function WorkshopToolbar({
  weeks,
  selectedMonday,
  onWeekChange,
  weekSelectDisabled,
  save,
  create,
  pageNumbers,
}: WorkshopToolbarProps) {
  if (weeks.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <WeekPicker
        weeks={weeks}
        value={selectedMonday}
        onChange={onWeekChange}
        disabled={weekSelectDisabled}
        trailing={<SaveStatus save={save} />}
      />
      {pageNumbers ? <PageNumbersToggle pageNumbers={pageNumbers} /> : null}
      <NewWeekForm
        suggestedMonday={create.suggestedMonday}
        onCreate={create.onCreate}
        creating={create.creating}
        createError={create.error}
        disabled={create.disabled}
      />
    </div>
  )
}

function SaveStatus({ save }: { save: ToolbarSaveControls }) {
  return (
    <>
      <Button
        type="button"
        onClick={save.onSave}
        disabled={save.disabled || save.saving}
      >
        {save.saving ? "Saving…" : "Save"}
      </Button>
      {save.message ? (
        <span className="text-xs text-muted-foreground">{save.message}</span>
      ) : null}
      {save.error ? (
        <span className="text-xs text-destructive">{save.error}</span>
      ) : null}
    </>
  )
}

function PageNumbersToggle({
  pageNumbers,
}: {
  pageNumbers: ToolbarPageNumberControls
}) {
  const disabled = pageNumbers.disabled || !pageNumbers.onChange

  // HTML Page 的片段可能自帶頁碼，不跟隨週層級設定；在此註明，避免作者以為勾選後每頁都會疊頁碼
  return (
    <div
      className={cn("space-y-1", disabled && "cursor-not-allowed opacity-50")}
    >
      <div className="flex items-center gap-2">
        <Checkbox
          id="week-show-page-numbers"
          checked={pageNumbers.show}
          disabled={disabled}
          aria-describedby="week-show-page-numbers-hint"
          onCheckedChange={(checked) =>
            pageNumbers.onChange?.(checked === true)
          }
        />
        <Label
          htmlFor="week-show-page-numbers"
          className={
            disabled ? "cursor-not-allowed text-muted-foreground" : undefined
          }
        >
          Show page numbers
        </Label>
      </div>
      <p
        id="week-show-page-numbers-hint"
        className="text-xs text-muted-foreground"
      >
        HTML pages show a page number only when set on the page.
      </p>
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
