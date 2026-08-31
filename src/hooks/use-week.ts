import { useEffect, useState } from "react"

import { loadWeekDocument } from "@/lib/load-week"
import {
  DEFAULT_WEEK_MONDAY,
  type WeekDocument,
} from "@/lib/week-document"

type UseWeekResult = {
  week: WeekDocument | null
  error: string | null
  loading: boolean
}

export function useWeek(monday: string = DEFAULT_WEEK_MONDAY): UseWeekResult {
  const [week, setWeek] = useState<WeekDocument | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadedMonday, setLoadedMonday] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    loadWeekDocument(monday)
      .then((document) => {
        if (!cancelled) {
          setWeek(document)
          setError(null)
          setLoadedMonday(monday)
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          const message =
            cause instanceof Error ? cause.message : "Failed to load week file"
          setError(message)
          setWeek(null)
          setLoadedMonday(monday)
        }
      })

    return () => {
      cancelled = true
    }
  }, [monday])

  const loading = loadedMonday !== monday

  return { week: loading ? null : week, error, loading }
}
