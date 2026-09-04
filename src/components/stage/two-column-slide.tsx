import { StagePanel } from "@/components/stage/panels/stage-panel"
import type { TwoColumnWeekPage } from "@/lib/week-document"

type TwoColumnSlideProps = {
  page: TwoColumnWeekPage
}

export function TwoColumnSlide({ page }: TwoColumnSlideProps) {
  return (
    <section className="stage-slide" data-testid="two-column-slide">
      <h1>{page.title}</h1>
      <div className="stage-cols">
        <div className="stage-items">
          {page.items.map((item) => (
            <div className="stage-item" key={item.heading}>
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
