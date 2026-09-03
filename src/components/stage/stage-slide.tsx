import { HtmlSlide } from "@/components/stage/html-slide"
import { TwoColumnSlide } from "@/components/stage/two-column-slide"
import { DEFAULT_WEEK_MONDAY, type WeekPage } from "@/lib/week-document"

type StageSlideProps = {
  page: WeekPage
  monday?: string
  isCapture?: boolean
}

export function StageSlide({
  page,
  monday = DEFAULT_WEEK_MONDAY,
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
