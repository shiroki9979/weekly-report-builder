import { parseDeck, type Deck } from "@/lib/deck"

export async function fetchDeck(deckId: string): Promise<Deck> {
  const response = await fetch(`/decks/${deckId}.json`)

  if (!response.ok) {
    throw new Error(
      `Failed to load deck file: ${deckId}.json (${response.status})`
    )
  }

  const json: unknown = await response.json()
  return parseDeck(json)
}

export async function fetchDeckIds(): Promise<string[]> {
  const response = await fetch("/api/decks")

  if (!response.ok) {
    throw new Error(`Failed to list deck files (${response.status})`)
  }

  const json: unknown = await response.json()
  if (
    typeof json !== "object" ||
    json === null ||
    !("decks" in json) ||
    !Array.isArray(json.decks)
  ) {
    throw new Error("Invalid deck list response")
  }

  return json.decks.filter((id): id is string => typeof id === "string")
}

export async function putDeck(deckId: string, deck: Deck): Promise<void> {
  const response = await fetch(`/api/decks/${deckId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(deck),
  })

  if (!response.ok) {
    throw new Error(
      `Failed to save deck file: ${deckId}.json (${response.status})`
    )
  }
}

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
