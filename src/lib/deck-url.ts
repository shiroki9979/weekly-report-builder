import { isDeckId } from "@/lib/deck-id"

const DECK_PARAM = "deck"

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
