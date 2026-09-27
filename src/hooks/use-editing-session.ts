import { useCallback, useEffect, useRef, useState } from "react"

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
import type { ExportIssue } from "@/lib/export-readiness"
import type { MetricValueField } from "@/lib/metric-input"
import { latestWeekMonday, nextMondayAfter } from "@/lib/week-clone"
import type { WeekDocument, WeekPage } from "@/lib/week-document"
import type { WeekStore } from "@/lib/week-store"

export type EditingSessionResult = {
  weeks: string[]
  selectedMonday: string
  setSelectedMonday: (monday: string) => void
  week: WeekDocument | null
  operationSnapshot: () => SessionOperationSnapshot | null
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

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback
}

export function useEditingSession(store: WeekStore): EditingSessionResult {
  const [session, setSession] = useState(createEditingSession)
  const sessionRef = useRef(session)
  const generation = useRef(0)
  const saveOperation = useRef(0)
  const createOperation = useRef(0)

  const update = useCallback(
    (change: (current: EditingSession) => EditingSession) => {
      const next = change(sessionRef.current)
      sessionRef.current = next
      setSession(next)
    },
    []
  )

  const openWeek = useCallback(
    async (monday: string) => {
      const currentGeneration = ++generation.current
      update((current) => beginSessionOpen(current, monday))
      try {
        const week = await store.loadWeek(monday)
        if (currentGeneration === generation.current) {
          update((current) => finishSessionOpen(current, week))
        }
      } catch (cause) {
        if (currentGeneration === generation.current) {
          update((current) =>
            failSessionOpen(
              current,
              errorMessage(cause, "Failed to load week file")
            )
          )
        }
      }
    },
    [store, update]
  )

  useEffect(() => {
    const currentGeneration = ++generation.current
    const requestGeneration = generation
    async function start() {
      try {
        const weeks = await store.listWeeks()
        if (currentGeneration !== generation.current) return
        update((current) => setSessionWeeks(current, weeks))
        const latest = latestWeekMonday(weeks)
        if (latest) void openWeek(latest)
      } catch (cause) {
        if (currentGeneration === generation.current) {
          update((current) =>
            failSessionOpen(
              current,
              errorMessage(cause, "Failed to list week files")
            )
          )
        }
      }
    }
    void start()
    return () => {
      requestGeneration.current++
    }
  }, [store, openWeek, update])

  const setSelectedMonday = useCallback(
    (monday: string) => {
      if (monday !== sessionRef.current.selectedMonday) void openWeek(monday)
    },
    [openWeek]
  )

  const saveWeek = useCallback(async () => {
    const current = sessionRef.current
    if (!current.week) return
    const gate = canSaveSession(current)
    update(() => gate.session)
    if (!gate.allowed) return
    const currentGeneration = generation.current
    const currentOperation = ++saveOperation.current
    update(beginSessionSave)
    try {
      await store.saveWeek(current.selectedMonday, current.week)
      if (
        currentGeneration === generation.current &&
        currentOperation === saveOperation.current
      ) {
        update(finishSessionSave)
      }
    } catch (cause) {
      if (
        currentGeneration === generation.current &&
        currentOperation === saveOperation.current
      ) {
        update((session) =>
          failSessionSave(
            session,
            errorMessage(cause, "Failed to save week file")
          )
        )
      }
    }
  }, [store, update])

  const createWeek = useCallback(
    async (monday: string) => {
      const currentGeneration = ++generation.current
      const currentOperation = ++createOperation.current
      update(beginSessionCreate)
      try {
        const week = await store.createWeekFromPrevious(monday)
        if (
          currentGeneration !== generation.current ||
          currentOperation !== createOperation.current
        )
          return
        const weeks = await store.listWeeks()
        if (
          currentGeneration !== generation.current ||
          currentOperation !== createOperation.current
        )
          return
        update((current) =>
          finishSessionOpen(
            setSessionWeeks(beginSessionOpen(current, monday), weeks),
            week
          )
        )
      } catch (cause) {
        if (
          currentGeneration === generation.current &&
          currentOperation === createOperation.current
        ) {
          update((current) =>
            failSessionCreate(
              current,
              errorMessage(cause, "Failed to create week file")
            )
          )
        }
      }
    },
    [store, update]
  )

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
    setSelectedMonday,
    week,
    operationSnapshot: () => sessionOperationSnapshot(sessionRef.current),
    editContent: (change) =>
      update((current) => editSessionContent(current, change)),
    readMetricInput: (pageId, index, field) =>
      readMetricInput(session, pageId, index, field),
    writeMetricInput: (pageId, index, field, raw) =>
      update((current) => writeMetricInput(current, pageId, index, field, raw)),
    moveMetric: (pageId, from, to) =>
      update((current) => moveSessionMetric(current, pageId, from, to)),
    removeMetric: (pageId, index) =>
      update((current) => removeSessionMetric(current, pageId, index)),
    addPage: (page) => update((current) => addSessionPage(current, page)),
    deletePage: (pageId) =>
      update((current) => deleteSessionPage(current, pageId)),
    movePage: (pageId, direction) =>
      update((current) => moveSessionPage(current, pageId, direction)),
    readiness: (pageId) => sessionReadiness(session, pageId),
    selectedPageId:
      week?.pages[selectedPageIndex]?.id ?? session.selectedPageId,
    selectedPageIndex,
    setSelectedPageIndex: (index) => {
      const page = week?.pages[index]
      if (page) update((current) => selectSessionPage(current, page.id))
    },
    loadStatus: session.loadStatus,
    suggestedMonday: latest ? nextMondayAfter(latest) : "",
    save: {
      saving: session.saving,
      error: session.saveError,
      message: session.savedMessage,
      saveWeek,
    },
    create: {
      creating: session.creating,
      error: session.createError,
      createWeek,
    },
  }
}
