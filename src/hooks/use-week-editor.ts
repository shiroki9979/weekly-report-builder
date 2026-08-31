import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"

import {
  latestWeekMonday,
  nextMondayAfter,
} from "@/lib/week-clone"
import {
  DEFAULT_WEEK_MONDAY,
  type WeekDocument,
} from "@/lib/week-document"
import {
  createWeekFromPrevious,
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
  creating: boolean
  createError: string | null
  suggestedMonday: string
  createWeek: (monday: string) => Promise<void>
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
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const loading = loadedMonday !== selectedMonday
  const latestMonday = latestWeekMonday(weeks)
  const suggestedMonday = latestMonday
    ? nextMondayAfter(latestMonday)
    : nextMondayAfter(DEFAULT_WEEK_MONDAY)

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

  const createWeek = useCallback(
    async (monday: string) => {
      setCreating(true)
      setCreateError(null)
      setSaveMessage(null)

      try {
        await createWeekFromPrevious(monday)
        const weekList = await listWeekFiles()
        setWeeks(weekList)
        setSelectedMonday(monday)
        setSelectedPageIndex(0)
        setLoadedMonday(null)
      } catch (cause: unknown) {
        const message =
          cause instanceof Error ? cause.message : "Failed to create week file"
        setCreateError(message)
      } finally {
        setCreating(false)
      }
    },
    []
  )

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
    creating,
    createError,
    suggestedMonday,
    createWeek,
  }
}
