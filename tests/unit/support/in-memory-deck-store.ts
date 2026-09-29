import { cloneWeekFromPrevious, latestWeekMonday } from "@/lib/weekly-series"
import type { Deck } from "@/lib/deck"
import type { DeckStore } from "@/lib/deck-store"

// 建立週次的錯誤文案與 dev server 相同，hook 測試斷言的訊息才等同作者實際看到的
export class InMemoryDeckStore implements DeckStore {
  private readonly documents: Map<string, Deck>

  constructor(documents = new Map<string, Deck>()) {
    this.documents = documents
  }

  async listDecks(): Promise<string[]> {
    return [...this.documents.keys()].sort()
  }

  async loadDeck(deckId: string): Promise<Deck> {
    const deck = this.documents.get(deckId)
    if (!deck) throw new Error(`Week not found: ${deckId}`)
    return structuredClone(deck)
  }

  async saveDeck(deckId: string, deck: Deck): Promise<void> {
    if (!this.documents.has(deckId))
      throw new Error(`Week not found: ${deckId}`)
    this.documents.set(deckId, structuredClone(deck))
  }

  async createWeekFromPrevious(monday: string): Promise<Deck> {
    if (this.documents.has(monday))
      throw new Error(`Deck already exists: ${monday}`)
    const previous = latestWeekMonday(await this.listDecks())
    if (!previous) throw new Error("No previous week to clone")
    const deck = cloneWeekFromPrevious(await this.loadDeck(previous), monday)
    this.documents.set(monday, structuredClone(deck))
    return deck
  }
}
