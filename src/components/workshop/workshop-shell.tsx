import { StageSlide } from "@/components/stage/stage-slide"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { useWeek } from "@/hooks/use-week"
import { getPreviewPage } from "@/lib/preview-page"

import { StageFrame } from "@/components/stage/stage-frame"

/** shadcn 工坊殼：左編輯、右 16:9 預覽 */
export function WorkshopShell() {
  const { week, error, loading } = useWeek()
  const previewPage = week ? getPreviewPage(week) : null

  return (
    <div className="flex h-svh min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
        <h1 className="text-sm font-medium">Weekly Report Builder</h1>
        <span className="text-xs text-muted-foreground">Workshop</span>
        {week ? (
          <span className="text-xs text-muted-foreground">
            {week.start} – {week.end}
          </span>
        ) : null}
      </header>

      <ResizablePanelGroup
        orientation="horizontal"
        className="min-h-0 flex-1"
        id="weekly-workshop-panels"
      >
        <ResizablePanel defaultSize={42} minSize={28} maxSize={60}>
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              <section className="space-y-2">
                <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Editor
                </h2>
                <p className="text-sm text-muted-foreground">
                  Week picker and form (ticket 02)
                </p>
              </section>
              <Separator />
              <section className="space-y-2">
                <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Notes
                </h2>
                <p className="text-sm text-muted-foreground">
                  {previewPage?.notes ?? "Speaker notes (ticket 02)"}
                </p>
              </section>
            </div>
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={58} minSize={40}>
          <div className="flex h-full min-h-0 flex-col p-4">
            <div className="mb-3 shrink-0">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                16:9 preview
              </h2>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <div className="w-full max-w-5xl">
                <StageFrame>
                  {loading ? (
                    <div className="stage-placeholder">Loading week…</div>
                  ) : null}
                  {!loading && error ? (
                    <div className="stage-warning" role="alert">
                      {error}
                    </div>
                  ) : null}
                  {!loading && previewPage ? (
                    <StageSlide page={previewPage} />
                  ) : null}
                </StageFrame>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
