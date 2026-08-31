import { useRef, useState } from "react"
import {
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SunIcon,
} from "lucide-react"
import { usePanelRef } from "react-resizable-panels"

import { StageSlide } from "@/components/stage/stage-slide"
import { StageFrame } from "@/components/stage/stage-frame"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import {
  ExportControls,
  StageCaptureHost,
} from "@/components/workshop/export-controls"
import { PageEditorForm } from "@/components/workshop/page-editor-form"
import { PageNavigator } from "@/components/workshop/page-navigator"
import {
  PagePicker,
  WorkshopToolbar,
} from "@/components/workshop/week-picker"
import { useStageExport } from "@/hooks/use-stage-export"
import { usePageKeyboardNav } from "@/hooks/use-page-keyboard-nav"
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

  const previewStageRef = useRef<HTMLDivElement>(null)
  const captureHostRef = useRef<HTMLDivElement>(null)
  const {
    capturePage,
    exporting,
    copying,
    exportError,
    clipboardError,
    downloadVisiblePages,
    copyCurrentPage,
  } = useStageExport({
    monday: selectedMonday,
    week,
    previewStageRef,
    captureHostRef,
  })

  const selectedPage = week?.pages[selectedPageIndex] ?? null
  const editorPanelRef = usePanelRef()
  const [editorCollapsed, setEditorCollapsed] = useState(false)

  usePageKeyboardNav({
    pageCount: week?.pages.length ?? 0,
    selectedPageIndex,
    onSelect: setSelectedPageIndex,
    enabled: !loading && week !== null,
  })

  const { theme, setTheme } = useTheme()
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light")
      return
    }

    if (theme === "light") {
      setTheme("dark")
      return
    }

    setTheme(
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "light"
        : "dark"
    )
  }

  const toggleEditorPanel = () => {
    const panel = editorPanelRef.current
    if (!panel) {
      return
    }

    if (panel.isCollapsed()) {
      panel.expand()
    } else {
      panel.collapse()
    }
  }

  return (
    <div className="flex h-svh min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={
            editorCollapsed ? "Expand editor panel" : "Collapse editor panel"
          }
          aria-pressed={editorCollapsed}
          onClick={toggleEditorPanel}
        >
          {editorCollapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
        </Button>
        <h1 className="text-sm font-medium">Weekly Report Builder</h1>
        <span className="text-xs text-muted-foreground">Workshop</span>
        {week ? (
          <span className="text-xs text-muted-foreground">
            {week.start} – {week.end}
          </span>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="ml-auto"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={toggleTheme}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </Button>
      </header>

      <ResizablePanelGroup
        orientation="horizontal"
        className="min-h-0 flex-1"
        id="weekly-workshop-panels"
      >
        <ResizablePanel
          id="editor"
          panelRef={editorPanelRef}
          collapsible
          collapsedSize={0}
          defaultSize="42"
          minSize="20"
          maxSize="60"
          onResize={() => {
            setEditorCollapsed(editorPanelRef.current?.isCollapsed() ?? false)
          }}
        >
          <ScrollArea className="h-full min-w-0">
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

        <ResizableHandle withHandle disabled={editorCollapsed} />

        <ResizablePanel
          id="preview"
          defaultSize="58"
          minSize="40"
          groupResizeBehavior="preserve-relative-size"
        >
          <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-4">
            <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                16:9 preview
              </h2>
              <ExportControls
                onDownloadAll={() => void downloadVisiblePages()}
                onCopy={() => void copyCurrentPage()}
                exporting={exporting}
                copying={copying}
                exportError={exportError}
                clipboardError={clipboardError}
                disabled={loading || !week}
              />
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <div className="w-full max-w-5xl">
                <StageFrame ref={previewStageRef}>
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
            {week ? (
              <PageNavigator
                pages={week.pages}
                selectedPageIndex={selectedPageIndex}
                onSelect={setSelectedPageIndex}
                disabled={loading}
              />
            ) : null}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      <StageCaptureHost page={capturePage} hostRef={captureHostRef} />
    </div>
  )
}
