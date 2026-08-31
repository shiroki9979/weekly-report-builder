import { StageFrame } from "@/components/stage/stage-frame"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

/** shadcn 工坊殼：左編輯、右 16:9 預覽 */
export function WorkshopShell() {
  return (
    <div className="flex h-svh min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
        <h1 className="text-sm font-medium">Weekly Report Builder</h1>
        <span className="text-xs text-muted-foreground">工坊</span>
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
                  編輯區
                </h2>
                <p className="text-sm text-muted-foreground">
                  表單與週次選擇（ticket 02）
                </p>
              </section>
              <Separator />
              <section className="space-y-2">
                <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  備註
                </h2>
                <p className="text-sm text-muted-foreground">
                  Speaker notes（ticket 02）
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
                16:9 預覽
              </h2>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <div className="w-full max-w-5xl">
                <StageFrame />
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
