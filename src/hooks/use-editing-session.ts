import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  addSessionPage,
  beginSessionCreate,
  beginSessionOpen,
  beginSessionSave,
  canSaveSession,
  createEditingSession,
  deleteSessionPage,
  editSessionContent,
  failSessionCreate,
  failSessionOpen,
  failSessionSave,
  finishSessionOpen,
  finishSessionSave,
  moveSessionMetric,
  moveSessionPage,
  readMetricInput,
  removeSessionMetric,
  selectSessionPage,
  sessionReadiness,
  sessionOperationSnapshot,
  setSessionWeeks,
  writeMetricInput,
  type EditingSession,
  type SessionOperationSnapshot,
} from "@/lib/editing-session"
import { errorMessage } from "@/lib/error-message"
import type { ExportIssue } from "@/lib/export-readiness"
import type { MetricInputLocation, MetricMove } from "@/lib/metric-input"
import type { PageMoveDirection } from "@/lib/page-lifecycle"
import { latestWeekMonday, nextMondayAfter } from "@/lib/week-clone"
import type { WeekDocument, WeekPage } from "@/lib/week-document"
import type { WeekStore } from "@/lib/week-store"

export type MetricEditorControls = {
  read: (location: MetricInputLocation) => string
  write: (location: MetricInputLocation, raw: string) => void
  move: (move: MetricMove) => void
  remove: (pageId: string, metricIndex: number) => void
  readiness: (pageId: string) => ExportIssue[]
}

export type EditingSessionResult = {
  weeks: string[]
  selectedMonday: string
  setSelectedMonday: (monday: string) => void
  week: WeekDocument | null
  operationSnapshot: () => SessionOperationSnapshot | null
  editContent: (update: (week: WeekDocument) => WeekDocument) => void
  metricControls: MetricEditorControls
  addPage: (page: WeekPage) => void
  deletePage: (pageId: string) => void
  movePage: (pageId: string, direction: PageMoveDirection) => void
  selectedPageId: string | null
  selectedPageIndex: number
  setSelectedPageIndex: (index: number) => void
  loadStatus: EditingSession["loadStatus"]
  suggestedMonday: string
  save: {
    saving: boolean
    error: string | null
    message: string | null
    saveWeek: () => Promise<void>
  }
  create: {
    creating: boolean
    error: string | null
    createWeek: (monday: string) => Promise<void>
  }
}

type SessionUpdate = (
  change: (current: EditingSession) => EditingSession
) => void

type SessionRef = { readonly current: EditingSession }

export function useEditingSession(store: WeekStore): EditingSessionResult {
  const [session, setSession] = useState(createEditingSession)
  const sessionRef = useRef(session)
  const update = useCallback<SessionUpdate>((change) => {
    const next = change(sessionRef.current)
    sessionRef.current = next
    setSession(next)
  }, [])
  const lifecycle = useWeekLifecycle(store, sessionRef, update)
  const view = sessionView(session)

  // 指令直接寫在 hook 內：update 會讀 ref，交給一般函式組裝會被 React Compiler 視為 render 期間存取 ref
  return {
    ...view,
    setSelectedMonday: lifecycle.setSelectedMonday,
    setSelectedPageIndex: (index) => {
      const page = view.week?.pages[index]
      if (page) update((current) => selectSessionPage(current, page.id))
    },
    operationSnapshot: () => sessionOperationSnapshot(sessionRef.current),
    editContent: (change) =>
      update((current) => editSessionContent(current, change)),
    metricControls: {
      read: (location) => readMetricInput(session, location),
      write: (location, raw) =>
        update((current) => writeMetricInput(current, location, raw)),
      move: (move) => update((current) => moveSessionMetric(current, move)),
      remove: (pageId, metricIndex) =>
        update((current) => removeSessionMetric(current, pageId, metricIndex)),
      readiness: (pageId) => sessionReadiness(session, pageId),
    },
    addPage: (page) => update((current) => addSessionPage(current, page)),
    deletePage: (pageId) =>
      update((current) => deleteSessionPage(current, pageId)),
    movePage: (pageId, direction) =>
      update((current) => moveSessionPage(current, pageId, direction)),
    save: {
      saving: session.saving,
      error: session.saveError,
      message: session.savedMessage,
      saveWeek: lifecycle.saveWeek,
    },
    create: {
      creating: session.creating,
      error: session.createError,
      createWeek: lifecycle.createWeek,
    },
  }
}

function sessionView(
  session: EditingSession
): Pick<
  EditingSessionResult,
  | "weeks"
  | "selectedMonday"
  | "week"
  | "selectedPageId"
  | "selectedPageIndex"
  | "loadStatus"
  | "suggestedMonday"
> {
  const week = session.loadStatus.kind === "loading" ? null : session.week
  const selectedPageIndex = week
    ? Math.max(
        0,
        week.pages.findIndex((page) => page.id === session.selectedPageId)
      )
    : 0
  const latest = latestWeekMonday(session.weeks)
  return {
    weeks: session.weeks,
    selectedMonday: session.selectedMonday,
    week,
    selectedPageId:
      week?.pages[selectedPageIndex]?.id ?? session.selectedPageId,
    selectedPageIndex,
    loadStatus: session.loadStatus,
    suggestedMonday: latest ? nextMondayAfter(latest) : "",
  }
}

type Sequence = { current: number }

type WeekLifecycle = {
  store: WeekStore
  update: SessionUpdate
  openedWeeks: Sequence
  saves: Sequence
  creates: Sequence
}

function useWeekLifecycle(
  store: WeekStore,
  sessionRef: SessionRef,
  update: SessionUpdate
) {
  const openedWeeks = useRef(0)
  const saves = useRef(0)
  const creates = useRef(0)
  const lifecycle = useMemo<WeekLifecycle>(
    () => ({ store, update, openedWeeks, saves, creates }),
    [store, update]
  )

  useEffect(() => startSession(lifecycle), [lifecycle])

  const setSelectedMonday = useCallback(
    (monday: string) => {
      if (monday !== sessionRef.current.selectedMonday) {
        void openWeek(lifecycle, monday)
      }
    },
    [lifecycle, sessionRef]
  )
  const saveWeek = useCallback(
    () => saveOpenWeek(lifecycle, sessionRef.current),
    [lifecycle, sessionRef]
  )
  const createWeek = useCallback(
    (monday: string) => createAndOpenWeek(lifecycle, monday),
    [lifecycle]
  )
  return { setSelectedMonday, saveWeek, createWeek }
}

// 遞增自己的序號並記下相關序號；之後任一序號變動，代表結果已過期、不得寫回 Session
function claimLatest(own: Sequence, ...watched: Sequence[]): () => boolean {
  own.current++
  const sequences = [own, ...watched]
  const claimed = sequences.map((sequence) => sequence.current)
  return () =>
    sequences.every((sequence, index) => sequence.current === claimed[index])
}

function startSession(lifecycle: WeekLifecycle): () => void {
  const isLatest = claimLatest(lifecycle.openedWeeks)
  void openLatestWeek(lifecycle, isLatest)
  // 卸載或換 store 後，進行中的列表與載入結果都不得寫回
  return () => {
    lifecycle.openedWeeks.current++
  }
}

async function openLatestWeek(
  lifecycle: WeekLifecycle,
  isLatest: () => boolean
): Promise<void> {
  const { store, update } = lifecycle
  try {
    const weeks = await store.listWeeks()
    if (!isLatest()) return
    update((current) => setSessionWeeks(current, weeks))
    const latest = latestWeekMonday(weeks)
    if (latest) void openWeek(lifecycle, latest)
  } catch (cause) {
    if (!isLatest()) return
    update((current) =>
      failSessionOpen(current, errorMessage(cause, "Failed to list week files"))
    )
  }
}

async function openWeek(
  lifecycle: WeekLifecycle,
  monday: string
): Promise<void> {
  const { store, update } = lifecycle
  const isLatest = claimLatest(lifecycle.openedWeeks)
  update((current) => beginSessionOpen(current, monday))
  try {
    const week = await store.loadWeek(monday)
    if (!isLatest()) return
    update((current) => finishSessionOpen(current, week))
  } catch (cause) {
    if (!isLatest()) return
    update((current) =>
      failSessionOpen(current, errorMessage(cause, "Failed to load week file"))
    )
  }
}

async function saveOpenWeek(
  lifecycle: WeekLifecycle,
  session: EditingSession
): Promise<void> {
  const { store, update } = lifecycle
  if (!session.week) {
    update((current) => failSessionSave(current, "No week is open"))
    return
  }
  const gate = canSaveSession(session)
  update(() => gate.session)
  if (!gate.allowed) return

  const isLatest = claimLatest(lifecycle.saves, lifecycle.openedWeeks)
  update(beginSessionSave)
  try {
    await store.saveWeek(session.selectedMonday, session.week)
    if (!isLatest()) return
    update(finishSessionSave)
  } catch (cause) {
    if (!isLatest()) return
    update((current) =>
      failSessionSave(current, errorMessage(cause, "Failed to save week file"))
    )
  }
}

async function createAndOpenWeek(
  lifecycle: WeekLifecycle,
  monday: string
): Promise<void> {
  const { store, update } = lifecycle
  const isLatest = claimLatest(lifecycle.creates, lifecycle.openedWeeks)
  update(beginSessionCreate)
  try {
    const week = await store.createWeekFromPrevious(monday)
    const weeks = await store.listWeeks()
    if (!isLatest()) return
    // 新週真正開啟時才讓舊週的進行中結果過期；建立失敗時，舊週的 Save 結果仍要回報
    lifecycle.openedWeeks.current++
    update((current) =>
      finishSessionOpen(
        setSessionWeeks(beginSessionOpen(current, monday), weeks),
        week
      )
    )
  } catch (cause) {
    if (!isLatest()) return
    update((current) =>
      failSessionCreate(
        current,
        errorMessage(cause, "Failed to create week file")
      )
    )
  }
}
