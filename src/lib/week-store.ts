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
