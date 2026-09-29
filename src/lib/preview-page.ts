import type { Deck } from "@/lib/deck"

export function getPreviewPage(deck: Deck) {
  return deck.pages.find((page) => !page.hidden) ?? deck.pages[0]
}
