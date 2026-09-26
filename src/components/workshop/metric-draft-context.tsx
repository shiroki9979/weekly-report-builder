/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import {
  writeMetricDraft,
  type MetricDraftBuffer,
  type MetricDraftPath,
} from "@/lib/metric-draft-buffer"

type MetricDraftContextValue = {
  buffer: MetricDraftBuffer
  setRaw: (pageId: string, path: MetricDraftPath, raw: string) => void
  replaceBuffer: (next: MetricDraftBuffer) => void
}

const MetricDraftContext = createContext<MetricDraftContextValue>({
  buffer: {},
  setRaw: () => undefined,
  replaceBuffer: () => undefined,
})

export function MetricDraftProvider({ children }: { children: ReactNode }) {
  const [buffer, setBuffer] = useState<MetricDraftBuffer>({})
  const value = useMemo(
    () => ({
      buffer,
      setRaw: (pageId: string, path: MetricDraftPath, raw: string) => {
        setBuffer((current) => writeMetricDraft(current, pageId, path, raw))
      },
      replaceBuffer: (next: MetricDraftBuffer) => {
        setBuffer(next)
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
