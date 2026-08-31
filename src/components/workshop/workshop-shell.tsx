import { useRef, useState, type Dispatch, type SetStateAction } from "react"
import {
  LockIcon,
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PencilIcon,
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
import { SpeakerNotesCue } from "@/components/workshop/speaker-notes-cue"
import {
  PagePicker,
  WorkshopToolbar,
} from "@/components/workshop/week-picker"
import { useStageExport } from "@/hooks/use-stage-export"
import { usePageKeyboardNav } from "@/hooks/use-page-keyboard-nav"
import { useWeekEditor } from "@/hooks/use-week-editor"
import type { WeekDocument } from "@/lib/week-document"

type EditorSidebarProps = {
  weeks: string[]
  selectedMonday: string
  onWeekChange: (monday: string) => void
  week: WeekDocument | null
  setWeek: Dispatch<SetStateAction<WeekDocument | null>>
  selectedPageIndex: number
  onPageSelect: (index: number) => void
  loading: boolean
  saving: boolean
  saveError: string | null
  saveMessage: string | null
  onSave: () => void
  creating: boolean
  createError: string | null
  suggestedMonday: string
  onCreateWeek: (monday: string) => void
}

/** 週次切換時以 key remount，editMode 自動回到鎖定 */
function EditorSidebar({
  weeks,
  selectedMonday,
  onWeekChange,
  week,
  setWeek,
  selectedPageIndex,
  onPageSelect,
  loading,
  saving,
  saveError,
  saveMessage,
  onSave,
  creating,
  createError,
  suggestedMonday,
  onCreateWeek,
}: EditorSidebarProps) {
  const [editMode, setEditMode] = useState(false)

  return (
    <ScrollArea className="h-full min-w-0">
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sidebar
            </p>
            <p className="text-xs text-muted-foreground">
              {editMode
                ? "Edit mode — forms are writable"
                : "Locked — browse only; unlock to edit"}
            </p>
          </div>
          <Button
            type="button"
            variant={editMode ? "outline" : "default"}
            size="sm"
            disabled={loading || !week}
            aria-pressed={editMode}
            onClick={() => setEditMode((current) => !current)}
          >
            {editMode ? <LockIcon /> : <PencilIcon />}
            {editMode ? "Lock" : "Edit"}
          </Button>
        </div>

        <WorkshopToolbar
          weeks={weeks}
          selectedMonday={selectedMonday}
          onWeekChange={onWeekChange}
          onSave={onSave}
          saving={saving}
          saveMessage={saveMessage}
          saveError={saveError}
          suggestedMonday={suggestedMonday}
          onCreateWeek={onCreateWeek}
          creating={creating}
          createError={createError}
          weekSelectDisabled={loading}
          saveDisabled={loading || !week || !editMode}
          createDisabled={loading || creating || !editMode}
        />

        {week ? (
          <>
            <PagePicker
              week={week}
              selectedPageIndex={selectedPageIndex}
              onSelect={onPageSelect}
            />
            <Separator />
            <PageEditorForm
              week={week}
              pageIndex={selectedPageIndex}
              onChange={setWeek}
              readOnly={!editMode}
            />
          </>
        ) : null}
      </div>
    </ScrollArea>
  )
}

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
          <EditorSidebar
            key={selectedMonday}
            weeks={weeks.length > 0 ? weeks : [selectedMonday]}
            selectedMonday={selectedMonday}
            onWeekChange={setSelectedMonday}
            week={week}
            setWeek={setWeek}
            selectedPageIndex={selectedPageIndex}
            onPageSelect={setSelectedPageIndex}
            loading={loading}
            saving={saving}
            saveError={saveError}
            saveMessage={saveMessage}
            onSave={() => void saveWeek()}
            creating={creating}
            createError={createError}
            suggestedMonday={suggestedMonday}
            onCreateWeek={(monday) => void createWeek(monday)}
          />
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
            {week ? <SpeakerNotesCue notes={selectedPage?.notes} /> : null}
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
