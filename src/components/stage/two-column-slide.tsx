import { EditorialFrame } from "@/components/stage/editorial-frame"
import { StagePanel } from "@/components/stage/panels/stage-panel"
import type { TwoColumnPage } from "@/lib/deck"
import type { StagePageContext } from "@/lib/stage-page-context"

type TwoColumnSlideProps = {
  page: TwoColumnPage
  context: StagePageContext
}

// 通用版型沒有單一溝通任務，不給 eyebrow 而不寫死一個詞（#67）
export function TwoColumnSlide({ page, context }: TwoColumnSlideProps) {
  return (
    <EditorialFrame
      headline={page.title}
      context={context}
      boundary={page.boundary}
    >
      <div className="stage-cols">
        <div className="stage-items">
          {page.items.map((item, index) => (
            <div className="stage-item" key={index}>
              <div className="stage-dot" aria-hidden="true" />
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
