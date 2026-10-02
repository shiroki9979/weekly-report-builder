import { createDeckFromTemplate } from "@/lib/deck-template"
import { planWeekFromPrevious } from "@/lib/weekly-series"
import type { Deck } from "@/lib/deck"
import type { WorkshopStore } from "@/lib/deck-store"

// 建立週次的規則與錯誤文案和 dev server 共用 weekly-series，hook 測試斷言的訊息才等同作者實際看到的
export class InMemoryWorkshopStore implements WorkshopStore {
  private readonly documents: Map<string, Deck>

  constructor(documents = new Map<string, Deck>()) {
    this.documents = documents
  }

  async listDecks(): Promise<string[]> {
    return [...this.documents.keys()].sort()
  }

  async loadDeck(deckId: string): Promise<Deck> {
    const deck = this.documents.get(deckId)
    if (!deck) throw new Error(`Deck not found: ${deckId}`)
    return structuredClone(deck)
  }

  async saveDeck(deckId: string, deck: Deck): Promise<void> {
    if (!this.documents.has(deckId))
      throw new Error(`Deck not found: ${deckId}`)
    this.documents.set(deckId, structuredClone(deck))
  }

  async createWeekFromPrevious(monday: string): Promise<Deck> {
    if (this.documents.has(monday))
      throw new Error(`Deck already exists: ${monday}`)
    const { templateId, period } = planWeekFromPrevious(
      await this.listDecks(),
      monday
    )
    const deck = createDeckFromTemplate(await this.loadDeck(templateId), {
      period,
    })
    this.documents.set(monday, structuredClone(deck))
    return deck
  }
}
