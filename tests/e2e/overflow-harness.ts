import {
  measureStageOverflow,
  STAGE_CAPTURE_ROOT_ATTR,
} from "../../src/lib/overflow-measurement"

declare global {
  interface Window {
    measureStageOverflow: typeof measureStageOverflow
    STAGE_CAPTURE_ROOT_ATTR: string
  }
}

window.measureStageOverflow = measureStageOverflow
window.STAGE_CAPTURE_ROOT_ATTR = STAGE_CAPTURE_ROOT_ATTR
