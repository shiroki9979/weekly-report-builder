import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"

import {
  DEFAULT_WEEK_MONDAY,
  type WeekDocument,
} from "@/lib/week-document"
import {
  listWeekFiles,
  loadWeekDocument,
  saveWeekDocument,
} from "@/lib/weeks-client"

type UseWeekEditorResult = {
  weeks: string[]
  selectedMonday: string
  setSelectedMonday: (monday: string) => void
  week: WeekDocument | null
  setWeek: Dispatch<SetStateAction<WeekDocument | null>>
  selectedPageIndex: number
  setSelectedPageIndex: (index: number) => void
  loading: boolean
  saving: boolean
  error: string | null
  saveError: string | null
  saveMessage: string | null
  saveWeek: () => Promise<void>
}

async function fetchWeekBundle(monday: string) {
  const [weeks, document] = await Promise.all([
    listWeekFiles(),
    loadWeekDocument(monday),
  ])

  return { weeks, document }
}

export function useWeekEditor(
  initialMonday: string = DEFAULT_WEEK_MONDAY
): UseWeekEditorResult {
  const [weeks, setWeeks] = useState<string[]>([])
  const [selectedMonday, setSelectedMonday] = useState(initialMonday)
  const [week, setWeek] = useState<WeekDocument | null>(null)
  const [selectedPageIndex, setSelectedPageIndex] = useState(0)
  const [loadedMonday, setLoadedMonday] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const loading = loadedMonday !== selectedMonday

  useEffect(() => {
    let cancelled = false

    fetchWeekBundle(selectedMonday)
      .then(({ weeks: weekList, document }) => {
        if (cancelled) {
          return
        }

        setWeeks(weekList)
        setWeek(document)
        setSelectedPageIndex(0)
        setLoadedMonday(selectedMonday)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (cancelled) {
          return
        }

        const message =
          cause instanceof Error ? cause.message : "Failed to load week file"
        setError(message)
        setWeek(null)
        setLoadedMonday(selectedMonday)
      })

    return () => {
      cancelled = true
    }
  }, [selectedMonday])

  const saveWeek = useCallback(async () => {
    if (!week) {
      return
    }

    setSaving(true)
    setSaveError(null)
    setSaveMessage(null)

    try {
      await saveWeekDocument(selectedMonday, week)
      const { weeks: weekList, document } = await fetchWeekBundle(selectedMonday)
      setWeeks(weekList)
      setWeek(document)
      setLoadedMonday(selectedMonday)
      setSaveMessage("Saved")
    } catch (cause: unknown) {
      const message =
        cause instanceof Error ? cause.message : "Failed to save week file"
      setSaveError(message)
    } finally {
      setSaving(false)
    }
  }, [selectedMonday, week])

  return {
    weeks,
    selectedMonday,
    setSelectedMonday,
    week: loading ? null : week,
    setWeek,
    selectedPageIndex,
    setSelectedPageIndex,
    loading,
    saving,
    error,
    saveError,
    saveMessage,
    saveWeek,
  }
}
