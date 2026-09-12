import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"

import { latestWeekMonday, nextMondayAfter } from "@/lib/week-clone"
import type { WeekDocument } from "@/lib/week-document"
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
  selectedPageId: string | null
  selectedPageIndex: number
  setSelectedPageIndex: (index: number) => void
  setSelectedPageId: (pageId: string) => void
  loading: boolean
  saving: boolean
  error: string | null
  emptyStore: boolean
  saveError: string | null
  saveMessage: string | null
  saveWeek: () => Promise<void>
  creating: boolean
  createError: string | null
  suggestedMonday: string
  createWeek: (monday: string) => Promise<void>
}

async function refreshWeekBundle(monday: string) {
  const [weeks, document] = await Promise.all([
    listWeekFiles(),
    loadWeekDocument(monday),
  ])

  return { weeks, document }
}

export function useWeekEditor(): UseWeekEditorResult {
  const [weeks, setWeeks] = useState<string[]>([])
  const [selectedMonday, setSelectedMonday] = useState("")
  const [week, setWeek] = useState<WeekDocument | null>(null)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [loadedMonday, setLoadedMonday] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emptyStore, setEmptyStore] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const loading = loadedMonday !== selectedMonday
  const latestMonday = latestWeekMonday(weeks)
  const suggestedMonday = latestMonday ? nextMondayAfter(latestMonday) : ""

  useEffect(() => {
    let cancelled = false

    async function loadSelectedWeek() {
      try {
        // 先列出可用週次再決定日期，避免啟動時打硬編碼 Monday 而把空 store 誤報成缺檔
        const weekList = await listWeekFiles()
        if (cancelled) {
          return
        }

        setWeeks(weekList)

        if (weekList.length === 0) {
          setEmptyStore(true)
          setWeek(null)
          setError(null)
          setLoadedMonday("")
          return
        }

        setEmptyStore(false)
        const monday = selectedMonday || latestWeekMonday(weekList)
        if (!monday) {
          return
        }

        if (!selectedMonday) {
          setSelectedMonday(monday)
          return
        }

        const document = await loadWeekDocument(selectedMonday)
        if (cancelled) {
          return
        }

        setWeek(document)
        setSelectedPageId(document.pages[0]?.id ?? null)
        setLoadedMonday(selectedMonday)
        setError(null)
      } catch (cause: unknown) {
        if (cancelled) {
          return
        }

        const message =
          cause instanceof Error ? cause.message : "Failed to load week file"
        // 清單或文件載入失敗都維持 error，不可落到 empty store
        setError(message)
        setEmptyStore(false)
        setWeek(null)
        setLoadedMonday(selectedMonday)
      }
    }

    void loadSelectedWeek()

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
      const { weeks: weekList, document } =
        await refreshWeekBundle(selectedMonday)
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

  const createWeek = useCallback(async (monday: string) => {
    setCreating(true)
    setCreateError(null)
    setSaveMessage(null)

    try {
      await createWeekFromPrevious(monday)
      const weekList = await listWeekFiles()
      setWeeks(weekList)
      setSelectedMonday(monday)
      setSelectedPageId(null)
      setLoadedMonday(null)
    } catch (cause: unknown) {
      const message =
        cause instanceof Error ? cause.message : "Failed to create week file"
      setCreateError(message)
    } finally {
      setCreating(false)
    }
  }, [])

  const visibleWeek = loading ? null : week
  const selectedPageIndex = visibleWeek
    ? Math.max(
        0,
        visibleWeek.pages.findIndex((page) => page.id === selectedPageId)
      )
    : 0

  const setSelectedPageIndex = useCallback(
    (index: number) => {
      const page = visibleWeek?.pages[index]
      if (page) {
        setSelectedPageId(page.id)
      }
    },
    [visibleWeek]
  )

  return {
    weeks,
    selectedMonday,
    setSelectedMonday,
    week: visibleWeek,
    setWeek,
    selectedPageId: visibleWeek?.pages[selectedPageIndex]?.id ?? selectedPageId,
    selectedPageIndex,
    setSelectedPageIndex,
    setSelectedPageId,
    loading,
    saving,
    error,
    emptyStore,
    saveError,
    saveMessage,
    saveWeek,
    creating,
    createError,
    suggestedMonday,
    createWeek,
  }
}
