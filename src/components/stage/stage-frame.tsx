import "@/styles/stage.css"

type StageFrameProps = {
  children?: React.ReactNode
}

/** 16:9 畫布外框；渲染邏輯留給 ticket 01 */
export function StageFrame({ children }: StageFrameProps) {
  return (
    <div className="stage-root" data-testid="stage-frame">
      {children ?? (
        <div className="stage-placeholder">16:9 preview stage</div>
      )}
    </div>
  )
}
