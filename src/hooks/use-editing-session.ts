import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  addSessionMetric,
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
  setSessionDecks,
  writeMetricInput,
  type EditingSession,
  type MetricEditorControls,
  type SessionOperationSnapshot,
} from "@/lib/editing-session"
import {
  cancelTrendRedate,
  changeTrendEndpoint,
  confirmTrendRedate,
  readTrendInput,
  setTrendCadence,
  setTrendObservationState,
  writeTrendInput,
  type TrendEditorControls,
} from "@/lib/trend-session"
import {
  readDeckIdFromUrl,
  readPageNumberFromUrl,
  withDeckId,
  withPageNumber,
} from "@/lib/deck-url"
import { errorMessage } from "@/lib/error-message"
import type { PageMoveDirection } from "@/lib/page-lifecycle"
import {
  defaultDeckId,
  latestWeekMonday,
  nextMondayAfter,
} from "@/lib/weekly-series"
import type { Deck, Page } from "@/lib/deck"
import type { WorkshopStore } from "@/lib/deck-store"

// 需經 Editing Session 才能安全改動的版型專屬操作（Metric Input、metric 增刪移、Trend 端點與改日期）；
// 鍵名對應 matchPage 的版型，PageEditorForm 依版型分派給各自的編輯器
export type LayoutEditorControls = {
  evidenceDecision: MetricEditorControls
  trendTarget: TrendEditorControls
}

export type EditingSessionResult = {
  decks: string[]
  selectedDeckId: string
  selectDeck: (deckId: string) => void
  deck: Deck | null
  operationSnapshot: () => SessionOperationSnapshot | null
  editContent: (update: (deck: Deck) => Deck) => void
  layoutControls: LayoutEditorControls
  addPage: (page: Page) => void
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
    saveDeck: () => Promise<void>
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

export function useEditingSession(store: WorkshopStore): EditingSessionResult {
  const [session, setSession] = useState(createEditingSession)
  const sessionRef = useRef(session)
  const update = useCallback<SessionUpdate>((change) => {
    const next = change(sessionRef.current)
    sessionRef.current = next
    setSession(next)
  }, [])
  const view = sessionView(session)
  const lifecycle = useDeckLifecycle(
    store,
    sessionRef,
    update,
    sessionLocation(session)
  )

  // 指令直接寫在 hook 內：update 會讀 ref，交給一般函式組裝會被 React Compiler 視為 render 期間存取 ref
  return {
    ...view,
    selectDeck: lifecycle.selectDeck,
    setSelectedPageIndex: (index) => {
      const page = view.deck?.pages[index]
      if (page) update((current) => selectSessionPage(current, page.id))
    },
    operationSnapshot: () => sessionOperationSnapshot(sessionRef.current),
    editContent: (change) =>
      update((current) => editSessionContent(current, change)),
    layoutControls: {
      evidenceDecision: {
        read: (location) => readMetricInput(session, location),
        write: (location, raw) =>
          update((current) => writeMetricInput(current, location, raw)),
        add: (pageId) => update((current) => addSessionMetric(current, pageId)),
        move: (move) => update((current) => moveSessionMetric(current, move)),
        remove: (metric) =>
          update((current) => removeSessionMetric(current, metric)),
        readiness: (pageId) => sessionReadiness(session, pageId),
      },
      trendTarget: {
        read: (location) => readTrendInput(session, location),
        write: (location, raw) =>
          update((current) => writeTrendInput(current, location, raw)),
        setObservationState: (location, state) =>
          update((current) =>
            setTrendObservationState(current, location, state)
          ),
        changeEndpoint: (pageId, action) =>
          update((current) => changeTrendEndpoint(current, pageId, action)),
        setCadence: (pageId, cadence) =>
          update((current) => setTrendCadence(current, pageId, cadence)),
        confirmRedate: (pageId) =>
          update((current) => confirmTrendRedate(current, pageId)),
        cancelRedate: (pageId) =>
          update((current) => cancelTrendRedate(current, pageId)),
        readiness: (pageId) => sessionReadiness(session, pageId),
      },
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
      saveDeck: lifecycle.saveDeck,
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
  | "decks"
  | "selectedDeckId"
  | "deck"
  | "selectedPageId"
  | "selectedPageIndex"
  | "loadStatus"
  | "suggestedMonday"
> {
  const deck = session.loadStatus.kind === "loading" ? null : session.deck
  const selectedPageIndex = deck
    ? Math.max(
        0,
        deck.pages.findIndex((page) => page.id === session.selectedPageId)
      )
    : 0
  const latest = latestWeekMonday(session.decks)
  return {
    decks: session.decks,
    selectedDeckId: session.selectedDeckId,
    deck,
    selectedPageId:
      deck?.pages[selectedPageIndex]?.id ?? session.selectedPageId,
    selectedPageIndex,
    loadStatus: session.loadStatus,
    suggestedMonday: latest ? nextMondayAfter(latest) : "",
  }
}

// 頁碼對應 Workshop 導覽列的計數（含 Hidden Page），不是 Stage 上的 Page Position
function sessionLocation(session: EditingSession): DeckLocation {
  const { selectedDeckId, deck, selectedPageIndex } = sessionView(session)
  return {
    deckId: selectedDeckId,
    pageNumber: deck ? selectedPageIndex + 1 : null,
  }
}

type Sequence = { current: number }

// pageNumber 從 1 起算；Deck 尚未載入完成時為 null，代表頁碼未知
type DeckLocation = {
  deckId: string
  pageNumber: number | null
}

type DeckLifecycle = {
  store: WorkshopStore
  update: SessionUpdate
  openedDecks: Sequence
  saves: Sequence
  creates: Sequence
}

function useDeckLifecycle(
  store: WorkshopStore,
  sessionRef: SessionRef,
  update: SessionUpdate,
  location: DeckLocation
) {
  const openedDecks = useRef(0)
  const saves = useRef(0)
  const creates = useRef(0)
  const lifecycle = useMemo<DeckLifecycle>(
    () => ({ store, update, openedDecks, saves, creates }),
    [store, update]
  )

  useEffect(() => startSession(lifecycle), [lifecycle])

  const selectDeck = useCallback(
    (deckId: string) => {
      if (deckId !== sessionRef.current.selectedDeckId) {
        void openDeck(lifecycle, deckId)
      }
    },
    [lifecycle, sessionRef]
  )
  const saveDeck = useCallback(
    () => saveOpenDeck(lifecycle, sessionRef.current),
    [lifecycle, sessionRef]
  )
  const createWeek = useCallback(
    (monday: string) => createAndOpenWeek(lifecycle, monday),
    [lifecycle]
  )
  const restoreLocation = useCallback(
    ({ deckId, pageNumber }: DeckLocation) => {
      if (deckId !== sessionRef.current.selectedDeckId) {
        void openDeck(lifecycle, deckId, pageNumber)
        return
      }
      update((current) => selectPageNumber(current, pageNumber))
      // 頁碼超出範圍時 Session 不變、同步 effect 不會重跑，需直接改寫回實際頁碼
      writeDeckLocation(sessionLocation(sessionRef.current))
    },
    [lifecycle, sessionRef, update]
  )
  useDeckUrlSync(sessionRef, restoreLocation, location)
  return { selectDeck, saveDeck, createWeek }
}

// 網址是 Deck 與頁碼的可分享狀態，也承載瀏覽器歷史：選擇變動要寫回，上一頁／下一頁要還原
function useDeckUrlSync(
  sessionRef: SessionRef,
  restoreLocation: (location: DeckLocation) => void,
  { deckId, pageNumber }: DeckLocation
): void {
  useEffect(() => {
    if (deckId) writeDeckLocation({ deckId, pageNumber })
  }, [deckId, pageNumber])

  useEffect(() => {
    const onPopState = () => {
      const search = window.location.search
      const target =
        readDeckIdFromUrl(search) ?? defaultDeckId(sessionRef.current.decks)
      if (target) {
        restoreLocation({
          deckId: target,
          pageNumber: readPageNumberFromUrl(search),
        })
      }
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [sessionRef, restoreLocation])
}

// 切換 Deck 才新增歷史（首次用 replace，避免多一筆無意義的歷史）；換頁只改寫目前這筆，
// 方向鍵翻頁不會塞滿上一頁，回到先前的 Deck 時仍停在離開時的頁碼
function writeDeckLocation({ deckId, pageNumber }: DeckLocation): void {
  const url = new URL(window.location.href)
  const currentDeckId = readDeckIdFromUrl(url.search)
  if (currentDeckId !== deckId) {
    // 新 Deck 尚未載入時移除舊頁碼，避免殘留上一個 Deck 的頁碼
    const next = withPageNumber(withDeckId(url, deckId), pageNumber)
    const write = currentDeckId === null ? "replaceState" : "pushState"
    window.history[write](null, "", next)
    return
  }
  if (pageNumber === null) return
  if (readPageNumberFromUrl(url.search) === pageNumber) return
  window.history.replaceState(null, "", withPageNumber(url, pageNumber))
}

// 頁碼未指定或超出範圍時維持目前選擇，由網址同步改寫回實際頁碼
function selectPageNumber(
  session: EditingSession,
  pageNumber: number | null
): EditingSession {
  const page =
    pageNumber === null ? undefined : session.deck?.pages[pageNumber - 1]
  return page ? selectSessionPage(session, page.id) : session
}

// 遞增自己的序號並記下相關序號；之後任一序號變動，代表結果已過期、不得寫回 Session
function claimLatest(own: Sequence, ...watched: Sequence[]): () => boolean {
  own.current++
  const sequences = [own, ...watched]
  const claimed = sequences.map((sequence) => sequence.current)
  return () =>
    sequences.every((sequence, index) => sequence.current === claimed[index])
}

// 開啟其他 Deck 後，舊 Deck 進行中的載入、儲存與建立結果都不得再寫回
function expireOpenedDeckResults(lifecycle: DeckLifecycle): void {
  lifecycle.openedDecks.current++
}

type Outcome<T> = {
  // 過期失敗不再寫回畫面，只能靠這段描述在 console 辨識是哪個請求
  description: string
  resolved: (value: T) => void | Promise<void>
  rejected: (cause: unknown) => void
}

// 過期的結果不論成功或失敗都不寫回；失敗仍留下紀錄，避免切換 Deck 後 Save 失敗無從追查
async function whenLatest<T>(
  isLatest: () => boolean,
  request: () => Promise<T>,
  outcome: Outcome<T>
): Promise<void> {
  let value: T
  try {
    value = await request()
  } catch (cause) {
    if (isLatest()) outcome.rejected(cause)
    else console.warn(`Discarded stale failure: ${outcome.description}`, cause)
    return
  }
  if (isLatest()) await outcome.resolved(value)
}

function startSession(lifecycle: DeckLifecycle): () => void {
  const isLatest = claimLatest(lifecycle.openedDecks)
  void openInitialDeck(lifecycle, isLatest)
  // 卸載或換 store 後，進行中的列表與載入結果都不得寫回
  return () => expireOpenedDeckResults(lifecycle)
}

async function openInitialDeck(
  lifecycle: DeckLifecycle,
  isLatest: () => boolean
): Promise<void> {
  const { store, update } = lifecycle
  await whenLatest(isLatest, () => store.listDecks(), {
    description: "list decks",
    resolved: (decks) => {
      update((current) => setSessionDecks(current, decks))
      // 網址指定的 Deck 直接開啟；不存在時由載入失敗訊息明確呈現，而非靜默改開其他週
      const search = window.location.search
      const initial = readDeckIdFromUrl(search) ?? defaultDeckId(decks)
      if (initial) {
        void openDeck(lifecycle, initial, readPageNumberFromUrl(search))
      }
    },
    rejected: (cause) =>
      update((current) =>
        failSessionOpen(
          current,
          errorMessage(cause, "Failed to list deck files")
        )
      ),
  })
}

async function openDeck(
  lifecycle: DeckLifecycle,
  deckId: string,
  pageNumber: number | null = null
): Promise<void> {
  const { store, update } = lifecycle
  const isLatest = claimLatest(lifecycle.openedDecks)
  update((current) => beginSessionOpen(current, deckId))
  await whenLatest(isLatest, () => store.loadDeck(deckId), {
    description: `load deck ${deckId}`,
    resolved: (deck) =>
      update((current) =>
        selectPageNumber(finishSessionOpen(current, deck), pageNumber)
      ),
    rejected: (cause) =>
      update((current) =>
        failSessionOpen(
          current,
          errorMessage(cause, "Failed to load deck file")
        )
      ),
  })
}

async function saveOpenDeck(
  lifecycle: DeckLifecycle,
  session: EditingSession
): Promise<void> {
  const { store, update } = lifecycle
  const { deck, selectedDeckId } = session
  if (!deck) {
    update((current) => failSessionSave(current, "No deck is open"))
    return
  }
  const gate = canSaveSession(session)
  update(() => gate.session)
  if (!gate.allowed) return

  const isLatest = claimLatest(lifecycle.saves, lifecycle.openedDecks)
  update(beginSessionSave)
  await whenLatest(isLatest, () => store.saveDeck(selectedDeckId, deck), {
    description: `save deck ${selectedDeckId}`,
    resolved: () => update(finishSessionSave),
    rejected: (cause) =>
      update((current) =>
        failSessionSave(
          current,
          errorMessage(cause, "Failed to save deck file")
        )
      ),
  })
}

async function createAndOpenWeek(
  lifecycle: DeckLifecycle,
  monday: string
): Promise<void> {
  const { store, update } = lifecycle
  const isLatest = claimLatest(lifecycle.creates, lifecycle.openedDecks)
  const failCreate = (cause: unknown) =>
    update((current) =>
      failSessionCreate(
        current,
        errorMessage(cause, "Failed to create week file")
      )
    )
  update(beginSessionCreate)
  // 建立後先確認仍是最新操作，過期的建立不再列出 Deck
  await whenLatest(isLatest, () => store.createWeekFromPrevious(monday), {
    description: `create week ${monday}`,
    resolved: (deck) =>
      whenLatest(isLatest, () => store.listDecks(), {
        description: `list decks after creating ${monday}`,
        resolved: (decks) => {
          // 新週真正開啟時才讓舊 Deck 的進行中結果過期；建立失敗時，舊 Deck 的 Save 結果仍要回報
          expireOpenedDeckResults(lifecycle)
          update((current) =>
            finishSessionOpen(
              setSessionDecks(beginSessionOpen(current, monday), decks),
              deck
            )
          )
        },
        rejected: failCreate,
      }),
    rejected: failCreate,
  })
}
