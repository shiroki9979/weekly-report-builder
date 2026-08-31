import { StageSlide } from "@/components/stage/stage-slide"
import { StageFrame } from "@/components/stage/stage-frame"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { PageEditorForm } from "@/components/workshop/page-editor-form"
import {
  PagePicker,
  WorkshopToolbar,
} from "@/components/workshop/week-picker"
import { useWeekEditor } from "@/hooks/use-week-editor"

/** shadcn 工坊殼：左編輯、右 16:9 預覽 */
export function WorkshopShell() {
  const {
    weeks,
    selectedMonday,
    setSelectedMonday,
    week,
    setWeek,
    selectedPageIndex,
    setSelectedPageIndex,
    loading,
    saving,
    error,
    saveError,
    saveMessage,
    saveWeek,
    creating,
    createError,
    suggestedMonday,
    createWeek,
  } = useWeekEditor()

  const selectedPage = week?.pages[selectedPageIndex] ?? null

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
              <WorkshopToolbar
                weeks={weeks.length > 0 ? weeks : [selectedMonday]}
                selectedMonday={selectedMonday}
                onWeekChange={setSelectedMonday}
                onSave={() => void saveWeek()}
                saving={saving}
                saveMessage={saveMessage}
                saveError={saveError}
                suggestedMonday={suggestedMonday}
                onCreateWeek={(monday) => void createWeek(monday)}
                creating={creating}
                createError={createError}
                saveDisabled={loading || !week}
                createDisabled={loading || creating}
              />

              {week ? (
                <>
                  <PagePicker
                    week={week}
                    selectedPageIndex={selectedPageIndex}
                    onSelect={setSelectedPageIndex}
                  />
                  <Separator />
                  <PageEditorForm
                    week={week}
                    pageIndex={selectedPageIndex}
                    onChange={setWeek}
                  />
                </>
              ) : null}
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
                  {!loading && selectedPage ? (
                    <StageSlide page={selectedPage} />
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
