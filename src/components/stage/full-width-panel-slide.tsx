import { EditorialFrame } from "@/components/stage/editorial-frame"
import { StagePanel } from "@/components/stage/panels/stage-panel"
import type { FullWidthPanelPage } from "@/lib/deck"
import type { StagePageContext } from "@/lib/stage-page-context"

export function FullWidthPanelSlide({
  page,
  context,
}: {
  page: FullWidthPanelPage
  context: StagePageContext
}) {
  return (
    <EditorialFrame
      eyebrow="Panel"
      headline={page.title}
      context={context}
      boundary={page.boundary}
    >
      <div className="editorial-full-width-panel">
        <StagePanel panel={page.panel} fullWidth />
      </div>
    </EditorialFrame>
  )
}
