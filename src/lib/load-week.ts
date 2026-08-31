import { parseWeekDocument, type WeekDocument } from "@/lib/week-document"

export async function loadWeekDocument(monday: string): Promise<WeekDocument> {
  const response = await fetch(`/weeks/${monday}.json`)

  if (!response.ok) {
    throw new Error(`Failed to load week file: ${monday}.json (${response.status})`)
  }

  const json: unknown = await response.json()
  return parseWeekDocument(json)
}
