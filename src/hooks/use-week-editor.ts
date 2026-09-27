import { useCallback, useEffect, useRef, useState } from "react"

import {
  addSessionPage,
  applySavedSessionWeek,
  canSaveSession,
  createEditingSession,
  deleteSessionPage,
  editSessionContent,
  moveSessionMetric,
  moveSessionPage,
  openSessionWeek,
  readMetricInput,
  removeSessionMetric,
  selectSessionPage,
  sessionReadiness,
  writeMetricInput,
} from "@/lib/editing-session"
import type { ExportIssue } from "@/lib/export-readiness"
import type { MetricInputMap, MetricValueField } from "@/lib/metric-input"
import { latestWeekMonday, nextMondayAfter } from "@/lib/week-clone"
import type { WeekDocument, WeekPage } from "@/lib/week-document"
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
  metricBuffer: MetricInputMap
  editContent: (update: (week: WeekDocument) => WeekDocument) => void
  readMetricInput: (
    pageId: string,
    metricIndex: number,
    field: MetricValueField
  ) => string
  writeMetricInput: (
    pageId: string,
    metricIndex: number,
    field: MetricValueField,
    raw: string
  ) => void
  moveMetric: (pageId: string, fromIndex: number, toIndex: number) => void
  removeMetric: (pageId: string, metricIndex: number) => void
  addPage: (page: WeekPage) => void
  deletePage: (pageId: string) => void
  movePage: (pageId: string, direction: "up" | "down") => void
  readiness: (pageId: string) => ExportIssue[]
  selectedPageId: string | null
  selectedPageIndex: number
  setSelectedPageIndex: (index: number) => void
  loadStatus: WeekEditorLoadStatus
  suggestedMonday: string
  save: WeekSaveControls
  create: WeekCreateControls
}

export function useWeekEditor(): UseWeekEditorResult {
  const [weeks, setWeeks] = useState<string[]>([])
  const [selectedMonday, setSelectedMondayState] = useState("")
  const selectedMondayRef = useRef("")
  const [session, setSession] = useState(() => createEditingSession())
  const { week, selectedPageId } = session
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
      setSession((current) => openSessionWeek(current, null))
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
          setSession((current) => openSessionWeek(current, null))
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

        setSession((current) => openSessionWeek(current, document))
        setLoadStatus({ kind: "ready" })
      } catch (cause: unknown) {
        if (cancelled) {
          return
        }

        const message =
          cause instanceof Error ? cause.message : "Failed to load week file"
        // empty 與 list／文件失敗是同一 load status 的互斥分支，不可同時成立
        setLoadStatus({ kind: "error", message })
        setSession((current) => openSessionWeek(current, null))
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
    setSession((current) => applySavedSessionWeek(current, bundle.document))
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
      setSession((current) => openSessionWeek(current, null))
      setSelectedMonday(monday)
    },
    [setSelectedMonday]
  )

  // 建立新週時清掉上一週的 Saved 訊息，避免誤以為新週已存檔
  const create = useWeekCreate({
    onStart: save.clearMessage,
    onCreated: openCreatedWeek,
  })

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
        setSession((current) => selectSessionPage(current, page.id))
      }
    },
    [visibleWeek]
  )

  const editContent = useCallback(
    (update: (week: WeekDocument) => WeekDocument) => {
      setSession((current) => editSessionContent(current, update))
    },
    []
  )
  const addPage = useCallback((page: WeekPage) => {
    setSession((current) => addSessionPage(current, page))
  }, [])
  const deletePage = useCallback((pageId: string) => {
    setSession((current) => deleteSessionPage(current, pageId))
  }, [])
  const movePage = useCallback((pageId: string, direction: "up" | "down") => {
    setSession((current) => moveSessionPage(current, pageId, direction))
  }, [])
  const moveMetric = useCallback(
    (pageId: string, fromIndex: number, toIndex: number) => {
      setSession((current) =>
        moveSessionMetric(current, pageId, fromIndex, toIndex)
      )
    },
    []
  )
  const removeMetric = useCallback((pageId: string, metricIndex: number) => {
    setSession((current) => removeSessionMetric(current, pageId, metricIndex))
  }, [])
  const writeInput = useCallback(
    (
      pageId: string,
      metricIndex: number,
      field: MetricValueField,
      raw: string
    ) => {
      setSession((current) =>
        writeMetricInput(current, pageId, metricIndex, field, raw)
      )
    },
    []
  )
  const saveSession = useCallback(async () => {
    const gate = canSaveSession(session)
    setSession(gate.session)
    if (gate.allowed) {
      await save.saveWeek()
    }
  }, [save, session])

  return {
    weeks,
    selectedMonday,
    setSelectedMonday,
    week: visibleWeek,
    metricBuffer: session.metricInput,
    editContent,
    readMetricInput: (pageId, metricIndex, field) =>
      readMetricInput(session, pageId, metricIndex, field),
    writeMetricInput: writeInput,
    moveMetric,
    removeMetric,
    addPage,
    deletePage,
    movePage,
    readiness: (pageId) => sessionReadiness(session, pageId),
    selectedPageId: visibleWeek?.pages[selectedPageIndex]?.id ?? selectedPageId,
    selectedPageIndex,
    setSelectedPageIndex,
    loadStatus,
    suggestedMonday,
    save: {
      ...save,
      error: session.saveError ?? save.error,
      saveWeek: saveSession,
    },
    create,
  }
}
