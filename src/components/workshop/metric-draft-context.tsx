/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
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
  // setter 保持穩定身分，呼叫端才能放進 effect 依賴而不會每次打字就重跑
  const setRaw = useCallback(
    (pageId: string, path: MetricDraftPath, raw: string) => {
      setBuffer((current) => writeMetricDraft(current, pageId, path, raw))
    },
    []
  )
  const replaceBuffer = useCallback((next: MetricDraftBuffer) => {
    setBuffer(next)
  }, [])
  const value = useMemo(
    () => ({ buffer, setRaw, replaceBuffer }),
    [buffer, setRaw, replaceBuffer]
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
