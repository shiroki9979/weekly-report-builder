import { forwardRef } from "react"

import "@/styles/stage.css"

type StageFrameProps = {
  children?: React.ReactNode
}

/** 16:9 畫布外框；渲染邏輯留給 ticket 01 */
export const StageFrame = forwardRef<HTMLDivElement, StageFrameProps>(
  function StageFrame({ children }, ref) {
    return (
      <div ref={ref} className="stage-root" data-testid="stage-frame">
        {children ?? (
          <div className="stage-placeholder">16:9 preview stage</div>
        )}
      </div>
    )
  }
)
