/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import type { MetricDraftBuffer } from "@/lib/evidence-decision-editor"

type MetricDraftContextValue = {
  buffer: MetricDraftBuffer
  setRaw: (key: string, value: string) => void
}

const MetricDraftContext = createContext<MetricDraftContextValue>({
  buffer: {},
  setRaw: () => undefined,
})

export function MetricDraftProvider({ children }: { children: ReactNode }) {
  const [buffer, setBuffer] = useState<MetricDraftBuffer>({})
  const value = useMemo(
    () => ({
      buffer,
      setRaw: (key: string, value: string) => {
        setBuffer((current) => ({ ...current, [key]: value }))
      },
    }),
    [buffer]
  )

  return (
    <MetricDraftContext.Provider value={value}>
      {children}
    </MetricDraftContext.Provider>
  )
}

export function useMetricDraft(): MetricDraftContextValue {
  return useContext(MetricDraftContext)
}
