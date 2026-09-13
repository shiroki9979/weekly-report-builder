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

export type WeekEditorLoadStatus =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "ready" }

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
  loadStatus: WeekEditorLoadStatus
  loading: boolean
  saving: boolean
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
  const [selectedMonday, setSelectedMondayState] = useState("")
  const [week, setWeek] = useState<WeekDocument | null>(null)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [loadStatus, setLoadStatus] = useState<WeekEditorLoadStatus>({
    kind: "loading",
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const loading = loadStatus.kind === "loading"
  const latestMonday = latestWeekMonday(weeks)
  const suggestedMonday = latestMonday ? nextMondayAfter(latestMonday) : ""

  const setSelectedMonday = useCallback(
    (monday: string) => {
      if (monday === selectedMonday) {
        return
      }

      // 切週時立刻進入 loading，避免上一份 ready／empty／error 與新 Monday 並存一幀
      setLoadStatus({ kind: "loading" })
      setSelectedMondayState(monday)
    },
    [selectedMonday]
  )

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
          setLoadStatus({ kind: "empty" })
          setWeek(null)
          return
        }

        const monday = selectedMonday || latestWeekMonday(weekList)
        if (!monday) {
          return
        }

        if (!selectedMonday) {
          setSelectedMondayState(monday)
          return
        }

        const document = await loadWeekDocument(selectedMonday)
        if (cancelled) {
          return
        }

        setWeek(document)
        setSelectedPageId(document.pages[0]?.id ?? null)
        setLoadStatus({ kind: "ready" })
      } catch (cause: unknown) {
        if (cancelled) {
          return
        }

        const message =
          cause instanceof Error ? cause.message : "Failed to load week file"
        // empty 與 list／文件失敗是同一 load status 的互斥分支，不可同時成立
        setLoadStatus({ kind: "error", message })
        setWeek(null)
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
      setLoadStatus({ kind: "ready" })
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
        setSelectedPageId(null)
        setSelectedMonday(monday)
      } catch (cause: unknown) {
        const message =
          cause instanceof Error ? cause.message : "Failed to create week file"
        setCreateError(message)
      } finally {
        setCreating(false)
      }
    },
    [setSelectedMonday]
  )

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
    loadStatus,
    loading,
    saving,
    saveError,
    saveMessage,
    saveWeek,
    creating,
    createError,
    suggestedMonday,
    createWeek,
  }
}
