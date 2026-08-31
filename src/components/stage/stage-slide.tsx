import { TwoColumnSlide } from "@/components/stage/two-column-slide"
import type { WeekPage } from "@/lib/week-document"

type StageSlideProps = {
  page: WeekPage
}

export function StageSlide({ page }: StageSlideProps) {
  if (page.layout !== "two-column") {
    return (
      <div className="stage-warning" role="status">
        Unknown layout: {page.layout}
      </div>
    )
  }

  return <TwoColumnSlide page={page} />
}
