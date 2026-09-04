import { HtmlSlide } from "@/components/stage/html-slide"
import { TwoColumnSlide } from "@/components/stage/two-column-slide"
import {
  isHtmlWeekPage,
  isTwoColumnWeekPage,
  type WeekPage,
} from "@/lib/week-document"

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
  if (isHtmlWeekPage(page)) {
    return <HtmlSlide page={page} monday={monday} isCapture={isCapture} />
  }

  if (isTwoColumnWeekPage(page)) {
    return <TwoColumnSlide page={page} />
  }

  return (
    <div className="stage-warning" role="status">
      Unknown layout: {page.layout}
    </div>
  )
}
