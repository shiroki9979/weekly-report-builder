import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"

import { latestWeekMonday, nextMondayAfter } from "@/lib/week-clone"
import type { WeekDocument } from "@/lib/week-document"
import { listWeekFiles, loadWeekDocument } from "@/lib/weeks-client"

import { useWeekCreate, type WeekCreateControls } from "./use-week-create"
import {
  useWeekSave,
  type SavedWeekBundle,
  type WeekSaveControls,
} from "./use-week-save"

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
  suggestedMonday: string
  save: WeekSaveControls
  create: WeekCreateControls
}

export function useWeekEditor(): UseWeekEditorResult {
  const [weeks, setWeeks] = useState<string[]>([])
  const [selectedMonday, setSelectedMondayState] = useState("")
  const selectedMondayRef = useRef("")
  const [week, setWeek] = useState<WeekDocument | null>(null)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [loadStatus, setLoadStatus] = useState<WeekEditorLoadStatus>({
    kind: "loading",
  })

  const loading = loadStatus.kind === "loading"
  const latestMonday = latestWeekMonday(weeks)
  const suggestedMonday = latestMonday ? nextMondayAfter(latestMonday) : ""

  const setSelectedMonday = useCallback(
    (monday: string) => {
      if (monday === selectedMonday) {
        return
      }

      // 切週時立刻進入 loading，避免上一份 ready／empty／error 與新 Monday 並存一幀
      selectedMondayRef.current = monday
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
          setSelectedMonday(monday)
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
  }, [selectedMonday, setSelectedMonday])

  const isCurrentMonday = useCallback(
    (monday: string) => selectedMondayRef.current === monday,
    []
  )

  const applySavedWeek = useCallback((bundle: SavedWeekBundle) => {
    setWeeks(bundle.weeks)
    setWeek(bundle.document)
    setLoadStatus({ kind: "ready" })
  }, [])

  const save = useWeekSave({
    monday: selectedMonday,
    week,
    isCurrentMonday,
    onSaved: applySavedWeek,
  })

  const openCreatedWeek = useCallback(
    (weekList: string[], monday: string) => {
      setWeeks(weekList)
      setSelectedPageId(null)
      setSelectedMonday(monday)
    },
    [setSelectedMonday]
  )

  const { clearMessage: clearSaveMessage } = save
  const creator = useWeekCreate({ onCreated: openCreatedWeek })
  const { createWeek: createFromPrevious } = creator
  // 建立新週時清掉上一週的 Saved 訊息，避免誤以為新週已存檔
  const createWeek = useCallback(
    async (monday: string) => {
      clearSaveMessage()
      await createFromPrevious(monday)
    },
    [clearSaveMessage, createFromPrevious]
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
    suggestedMonday,
    save,
    create: { ...creator, createWeek },
  }
}
