import { parseDeck, type Deck } from "@/lib/deck"

// 週報流程的建新週 API；週次規則由 dev server 端的 weekly-series 判斷
export async function createWeekFromPrevious(monday: string): Promise<Deck> {
  const response = await fetch(`/api/decks/${monday}`, {
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(
      `Failed to create week file: ${monday}.json (${response.status})`
    )
  }

  const json: unknown = await response.json()
  if (
    typeof json !== "object" ||
    json === null ||
    !("deck" in json) ||
    typeof json.deck !== "object" ||
    json.deck === null
  ) {
    throw new Error("Invalid create week response")
  }

  return parseDeck(json.deck)
}
