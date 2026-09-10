import { forwardRef } from "react"

import { STAGE_CAPTURE_ROOT_ATTR } from "@/lib/overflow-measurement"
import "@/styles/editorial-layouts.css"
import "@/styles/stage.css"

type StageFrameProps = {
  children?: React.ReactNode
}

/** 16:9 畫布外框；固定 capture root 供 overflow 量測與 PNG 截圖共用 */
export const StageFrame = forwardRef<HTMLDivElement, StageFrameProps>(
  function StageFrame({ children }, ref) {
    return (
      <div
        ref={ref}
        className="stage-root"
        data-testid="stage-frame"
        {...{ [STAGE_CAPTURE_ROOT_ATTR]: "" }}
      >
        {children ?? (
          <div className="stage-placeholder">16:9 preview stage</div>
        )}
      </div>
    )
  }
)
