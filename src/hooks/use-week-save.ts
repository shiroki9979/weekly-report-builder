import { useCallback, useState } from "react"

import type { WeekDocument } from "@/lib/week-document"
import {
  listWeekFiles,
  loadWeekDocument,
  saveWeekDocument,
} from "@/lib/weeks-client"

export type SavedWeekBundle = {
  weeks: string[]
  document: WeekDocument
}

export type WeekSaveControls = {
  saving: boolean
  error: string | null
  message: string | null
  saveWeek: () => Promise<void>
  clearMessage: () => void
}

type UseWeekSaveOptions = {
  monday: string
  week: WeekDocument | null
  // 存檔期間可能已切週；過期結果不可覆蓋新選取週次的狀態
  isCurrentMonday: (monday: string) => boolean
  onSaved: (bundle: SavedWeekBundle) => void
}

async function refreshWeekBundle(monday: string): Promise<SavedWeekBundle> {
  const [weeks, document] = await Promise.all([
    listWeekFiles(),
    loadWeekDocument(monday),
  ])

  return { weeks, document }
}

export function useWeekSave({
  monday,
  week,
  isCurrentMonday,
  onSaved,
}: UseWeekSaveOptions): WeekSaveControls {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const saveWeek = useCallback(async () => {
    if (!week) {
      return
    }

    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      await saveWeekDocument(monday, week)
      const bundle = await refreshWeekBundle(monday)
      if (!isCurrentMonday(monday)) {
        return
      }

      onSaved(bundle)
      setMessage("Saved")
    } catch (cause: unknown) {
      if (!isCurrentMonday(monday)) {
        return
      }

      setError(
        cause instanceof Error ? cause.message : "Failed to save week file"
      )
    } finally {
      setSaving(false)
    }
  }, [isCurrentMonday, monday, onSaved, week])

  const clearMessage = useCallback(() => setMessage(null), [])

  return { saving, error, message, saveWeek, clearMessage }
}
