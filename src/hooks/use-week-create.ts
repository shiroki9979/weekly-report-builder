import { useCallback, useState } from "react"

import { createWeekFromPrevious, listWeekFiles } from "@/lib/weeks-client"

export type WeekCreateControls = {
  creating: boolean
  error: string | null
  createWeek: (monday: string) => Promise<void>
}

type UseWeekCreateOptions = {
  onCreated: (weeks: string[], monday: string) => void
}

export function useWeekCreate({
  onCreated,
}: UseWeekCreateOptions): WeekCreateControls {
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createWeek = useCallback(
    async (monday: string) => {
      setCreating(true)
      setError(null)

      try {
        await createWeekFromPrevious(monday)
        onCreated(await listWeekFiles(), monday)
      } catch (cause: unknown) {
        setError(
          cause instanceof Error ? cause.message : "Failed to create week file"
        )
      } finally {
        setCreating(false)
      }
    },
    [onCreated]
  )

  return { creating, error, createWeek }
}
