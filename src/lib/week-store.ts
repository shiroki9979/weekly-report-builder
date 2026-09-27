import { cloneWeekFromPrevious, latestWeekMonday } from "./week-clone"
import type { WeekDocument } from "./week-document"
import {
  createWeekFromPrevious,
  listWeekFiles,
  loadWeekDocument,
  saveWeekDocument,
} from "./weeks-client"

export type WeekStore = {
  listWeeks(): Promise<string[]>
  loadWeek(monday: string): Promise<WeekDocument>
  saveWeek(monday: string, week: WeekDocument): Promise<void>
  createWeekFromPrevious(monday: string): Promise<WeekDocument>
}

export const httpWeekStore: WeekStore = {
  listWeeks: listWeekFiles,
  loadWeek: loadWeekDocument,
  saveWeek: saveWeekDocument,
  createWeekFromPrevious,
}

export class InMemoryWeekStore implements WeekStore {
  private readonly documents: Map<string, WeekDocument>

  constructor(documents = new Map<string, WeekDocument>()) {
    this.documents = documents
  }

  async listWeeks(): Promise<string[]> {
    return [...this.documents.keys()].sort()
  }

  async loadWeek(monday: string): Promise<WeekDocument> {
    const week = this.documents.get(monday)
    if (!week) throw new Error(`Week not found: ${monday}`)
    return structuredClone(week)
  }

  async saveWeek(monday: string, week: WeekDocument): Promise<void> {
    if (!this.documents.has(monday))
      throw new Error(`Week not found: ${monday}`)
    this.documents.set(monday, structuredClone(week))
  }

  async createWeekFromPrevious(monday: string): Promise<WeekDocument> {
    if (this.documents.has(monday))
      throw new Error(`Week already exists: ${monday}`)
    const previous = latestWeekMonday(await this.listWeeks())
    if (!previous) throw new Error("No previous week exists")
    const week = cloneWeekFromPrevious(await this.loadWeek(previous), monday)
    this.documents.set(monday, structuredClone(week))
    return week
  }
}
