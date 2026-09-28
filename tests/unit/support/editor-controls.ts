import type { MetricEditorControls } from "@/lib/editing-session"
import type { TrendEditorControls } from "@/lib/trend-session"

// 測試頁面沒有對應版型時，表單不會呼叫這些控制
export const unusedComparisonMetricControls: MetricEditorControls = {
  read: () => "",
  write: () => {},
  add: () => {},
  move: () => {},
  remove: () => {},
  readiness: () => [],
}

export const unusedTrendControls: TrendEditorControls = {
  read: () => "",
  write: () => {},
  setObservationState: () => {},
  changeEndpoint: () => {},
  confirmRedate: () => {},
  cancelRedate: () => {},
  readiness: () => [],
}
