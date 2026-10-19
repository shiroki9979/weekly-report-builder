import type { Deck } from "./deck.ts"
import { DECK_ID_SOURCE } from "./deck-id.ts"

const DECK_FILE_NAME = new RegExp(`^(${DECK_ID_SOURCE})\\.json$`)

export function serializeDeck(deck: Deck): string {
  return `${JSON.stringify(deck, null, 2)}\n`
}

export function deckIdFromFile(fileName: string): string | null {
  const match = DECK_FILE_NAME.exec(fileName)
  return match?.[1] ?? null
}

export function listDeckIds(fileNames: string[]): string[] {
  return fileNames
    .map(deckIdFromFile)
    .filter((deckId): deckId is string => deckId !== null)
    .sort()
}
