import { EditorialFrame } from "@/components/stage/editorial-frame"
import { StagePanel } from "@/components/stage/panels/stage-panel"
import type { TwoColumnPage } from "@/lib/deck"
import type { StagePageContext } from "@/lib/stage-page-context"

type TwoColumnSlideProps = {
  page: TwoColumnPage
  context: StagePageContext
}

export function TwoColumnSlide({ page, context }: TwoColumnSlideProps) {
  return (
    <EditorialFrame page={page} context={context}>
      <div className="stage-cols">
        <div className="stage-items">
          {page.items.map((item, index) => (
            <div className="stage-item" key={index}>
              <div className="stage-dot" aria-hidden="true" />
              {/* 項目平行無序；索引只是主題的視覺標記，不讓輔助技術讀成順序 */}
              <span className="editorial-item-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>{item.heading}</h3>
                <p>{item.body}</p>
              </div>
            </div>
          ))}
        </div>
        <StagePanel panel={page.panel} />
      </div>
    </EditorialFrame>
  )
}
