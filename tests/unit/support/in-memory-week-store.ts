import { cloneWeekFromPrevious, latestWeekMonday } from "@/lib/weekly-series"
import type { WeekDocument } from "@/lib/week-document"
import type { WeekStore } from "@/lib/week-store"

// 建立週次的錯誤文案與 dev server 相同，hook 測試斷言的訊息才等同作者實際看到的
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
    if (!previous) throw new Error("No previous week to clone")
    const week = cloneWeekFromPrevious(await this.loadWeek(previous), monday)
    this.documents.set(monday, structuredClone(week))
    return week
  }
}
