import { HtmlSlide } from "@/components/stage/html-slide"
import { TwoColumnSlide } from "@/components/stage/two-column-slide"
import type { WeekPage } from "@/lib/week-document"

export type StageSlideProps = {
  page: WeekPage
  monday: string
  isCapture?: boolean
}

export function StageSlide({
  page,
  monday,
  isCapture = false,
}: StageSlideProps) {
  if (page.layout === "html") {
    return <HtmlSlide page={page} monday={monday} isCapture={isCapture} />
  }

  if (page.layout === "two-column") {
    return <TwoColumnSlide page={page} />
  }

  return (
    <div className="stage-warning" role="status">
      Unknown layout: {(page as { layout?: string }).layout}
    </div>
  )
}
