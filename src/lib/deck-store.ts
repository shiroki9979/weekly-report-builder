import type { Deck } from "./deck"
import { fetchDeckIds, fetchDeck, putDeck } from "./decks-client"
import { createWeekFromPrevious } from "./weekly-series-client"

export type DeckStore = {
  listDecks(): Promise<string[]>
  loadDeck(deckId: string): Promise<Deck>
  saveDeck(deckId: string, deck: Deck): Promise<void>
}

// 建新週是週報流程的入口，與 Deck 核心儲存分開宣告；核心不需要知道週次
export type WeeklySeriesStore = {
  createWeekFromPrevious(monday: string): Promise<Deck>
}

export type WorkshopStore = DeckStore & WeeklySeriesStore

export const httpWorkshopStore: WorkshopStore = {
  listDecks: fetchDeckIds,
  loadDeck: fetchDeck,
  saveDeck: putDeck,
  createWeekFromPrevious,
}
