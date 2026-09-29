import type { Deck } from "./deck"
import {
  createWeekFromPrevious,
  fetchDeckIds,
  fetchDeck,
  putDeck,
} from "./decks-client"

export type DeckStore = {
  listDecks(): Promise<string[]>
  loadDeck(deckId: string): Promise<Deck>
  saveDeck(deckId: string, deck: Deck): Promise<void>
  createWeekFromPrevious(deckId: string): Promise<Deck>
}

export const httpDeckStore: DeckStore = {
  listDecks: fetchDeckIds,
  loadDeck: fetchDeck,
  saveDeck: putDeck,
  createWeekFromPrevious,
}
