import { parseWeekDocument, type WeekDocument } from "@/lib/week-document"

export async function loadWeekDocument(monday: string): Promise<WeekDocument> {
  const response = await fetch(`/weeks/${monday}.json`)

  if (!response.ok) {
    throw new Error(
      `Failed to load week file: ${monday}.json (${response.status})`
    )
  }

  const json: unknown = await response.json()
  return parseWeekDocument(json)
}

export async function listWeekFiles(): Promise<string[]> {
  const response = await fetch("/api/weeks")

  if (!response.ok) {
    throw new Error(`Failed to list week files (${response.status})`)
  }

  const json: unknown = await response.json()
  if (
    typeof json !== "object" ||
    json === null ||
    !("weeks" in json) ||
    !Array.isArray(json.weeks)
  ) {
    throw new Error("Invalid week list response")
  }

  return json.weeks.filter((week): week is string => typeof week === "string")
}

export async function saveWeekDocument(
  monday: string,
  week: WeekDocument
): Promise<void> {
  const response = await fetch(`/api/weeks/${monday}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(week),
  })

  if (!response.ok) {
    throw new Error(
      `Failed to save week file: ${monday}.json (${response.status})`
    )
  }
}

export async function createWeekFromPrevious(
  monday: string
): Promise<WeekDocument> {
  const response = await fetch(`/api/weeks/${monday}`, {
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
    !("week" in json) ||
    typeof json.week !== "object" ||
    json.week === null
  ) {
    throw new Error("Invalid create week response")
  }

  return parseWeekDocument(json.week)
}
