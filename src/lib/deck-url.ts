import { isDeckId } from "@/lib/deck-id"

const DECK_PARAM = "deck"
const PAGE_PARAM = "page"
const PAGE_NUMBER_PATTERN = /^[1-9]\d*$/

// 以 `?deck=<id>` 表達目前選擇的 Deck；格式不合法視為未指定，避免非法值流入儲存層路由
export function readDeckIdFromUrl(search: string): string | null {
  const value = new URLSearchParams(search).get(DECK_PARAM)
  return value !== null && isDeckId(value) ? value : null
}

export function withDeckId(url: URL, deckId: string): URL {
  const next = new URL(url)
  next.searchParams.set(DECK_PARAM, deckId)
  return next
}

// 以 `?page=<n>` 表達頁碼（從 1 起算，與 Workshop 導覽列一致）；非正整數視為未指定，由開啟流程退回第一頁
export function readPageNumberFromUrl(search: string): number | null {
  const value = new URLSearchParams(search).get(PAGE_PARAM)
  return value !== null && PAGE_NUMBER_PATTERN.test(value)
    ? Number(value)
    : null
}

export function withPageNumber(url: URL, pageNumber: number | null): URL {
  const next = new URL(url)
  if (pageNumber === null) next.searchParams.delete(PAGE_PARAM)
  else next.searchParams.set(PAGE_PARAM, String(pageNumber))
  return next
}
