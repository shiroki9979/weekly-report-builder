import { StagePanel } from "@/components/stage/panels/stage-panel"
import type { TwoColumnPage } from "@/lib/deck"

type TwoColumnSlideProps = {
  page: TwoColumnPage
}

export function TwoColumnSlide({ page }: TwoColumnSlideProps) {
  return (
    <section className="stage-slide" data-testid="two-column-slide">
      <h1>{page.title}</h1>
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
    </section>
  )
}
