import { useEffect, useRef, useState } from "react"
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
import { ExportControls } from "@/components/workshop/export-controls"
import { PageEditorForm } from "@/components/workshop/page-editor-form"
import { PageLifecycleControls } from "@/components/workshop/page-lifecycle-controls"
import { PageNavigator } from "@/components/workshop/page-navigator"
import { SpeakerNotesCue } from "@/components/workshop/speaker-notes-cue"
import { PagePicker } from "@/components/workshop/page-picker"
import {
  WorkshopToolbar,
  type ToolbarCreateControls,
  type ToolbarSaveControls,
} from "@/components/workshop/workshop-toolbar"
import { useStageExport } from "@/hooks/use-stage-export"
import { usePageKeyboardNav } from "@/hooks/use-page-keyboard-nav"
import { useEditingSession } from "@/hooks/use-editing-session"
import {
  CAPTURE_STAGE_SIZE_LABEL,
  measureStageOverflow,
} from "@/lib/overflow-measurement"
import { createStagePageContext } from "@/lib/stage-page-context"
import type { WeekDocument, WeekPage } from "@/lib/week-document"
import type { WeekStore } from "@/lib/week-store"
import type {
  MetricEditorControls,
  SessionLoadStatus,
} from "@/lib/editing-session"
import type { TrendEditorControls } from "@/lib/trend-session"
import type { PageMoveDirection } from "@/lib/page-lifecycle"
import { setWeekShowPageNumbers } from "@/lib/week-editor"

export const EMPTY_STORE_MESSAGE =
  "weeks/ has no Week Documents. Remove an empty weeks/ directory if it exists, then run pnpm seed:weeks."

type PageSelection = {
  pageIndex: number
  pageId: string | null
  onSelect: (index: number) => void
  onAdd: (page: WeekPage) => void
  onDelete: (pageId: string) => void
  onMove: (pageId: string, direction: PageMoveDirection) => void
}

type EditorSidebarProps = {
  weeks: string[]
  selectedMonday: string
  onWeekChange: (monday: string) => void
  week: WeekDocument | null
  editContent: (update: (week: WeekDocument) => WeekDocument) => void
  metricControls: MetricEditorControls
  trendControls: TrendEditorControls
  selection: PageSelection
  loadStatus: SessionLoadStatus
  save: ToolbarSaveControls
  create: ToolbarCreateControls
}

/** 週次切換時以 key remount，editMode 自動回到鎖定 */
function EditorSidebar({
  weeks,
  selectedMonday,
  onWeekChange,
  week,
  editContent,
  metricControls,
  trendControls,
  selection,
  loadStatus,
  save,
  create,
}: EditorSidebarProps) {
  const [editMode, setEditMode] = useState(false)
  const loading = loadStatus.kind === "loading"
  const editable = !loading && week !== null && editMode

  return (
    <ScrollArea className="h-full min-w-0">
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
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

        {loadStatus.kind === "empty" ? (
          // 空 store 只說明如何 seed，不提供建立第一週
          <p className="text-sm text-muted-foreground" role="status">
            {EMPTY_STORE_MESSAGE}
          </p>
        ) : (
          <WorkshopToolbar
            weeks={weeks}
            selectedMonday={selectedMonday}
            onWeekChange={onWeekChange}
            weekSelectDisabled={loading}
            save={{ ...save, disabled: !editable }}
            create={{
              ...create,
              disabled: loading || create.creating || !editMode,
            }}
            pageNumbers={{
              show: week?.showPageNumbers ?? true,
              disabled: !editable,
              onChange: (show) =>
                editContent((current) => setWeekShowPageNumbers(current, show)),
            }}
          />
        )}

        {week ? (
          <>
            <PagePicker
              week={week}
              selectedPageIndex={selection.pageIndex}
              onSelect={selection.onSelect}
            />
            {selection.pageId ? (
              <PageLifecycleControls
                week={week}
                selectedPageId={selection.pageId}
                onAdd={selection.onAdd}
                onDelete={selection.onDelete}
                onMove={selection.onMove}
                disabled={!editMode}
              />
            ) : null}
            <Separator />
            <PageEditorForm
              week={week}
              pageIndex={selection.pageIndex}
              onChange={editContent}
              metricControls={metricControls}
              trendControls={trendControls}
              readOnly={!editMode}
            />
          </>
        ) : null}
      </div>
    </ScrollArea>
  )
}

/** shadcn 工坊殼：左編輯、右 16:9 預覽 */
export function WorkshopShell({ weekStore }: { weekStore: WeekStore }) {
  const {
    weeks,
    selectedMonday,
    setSelectedMonday,
    week,
    operationSnapshot,
    editContent,
    metricControls,
    trendControls,
    addPage,
    deletePage,
    movePage,
    selectedPageIndex,
    setSelectedPageIndex,
    selectedPageId,
    loadStatus,
    suggestedMonday,
    save,
    create,
  } = useEditingSession(weekStore)

  const loading = loadStatus.kind === "loading"
  const emptyStore = loadStatus.kind === "empty"
  const error = loadStatus.kind === "error" ? loadStatus.message : null

  const selectedPage = week?.pages[selectedPageIndex] ?? null
  const previewStageRef = useRef<HTMLDivElement>(null)
  const {
    exporting,
    copying,
    exportResult,
    resultIsError,
    downloadVisiblePages,
    copyCurrentPage,
  } = useStageExport({ operationSnapshot })

  const editorPanelRef = usePanelRef()
  const notesPanelRef = usePanelRef()
  const [editorCollapsed, setEditorCollapsed] = useState(false)
  const [notesExpanded, setNotesExpanded] = useState(true)
  const [previewOverflow, setPreviewOverflow] = useState<string | null>(null)

  useEffect(() => {
    const root = previewStageRef.current
    if (!root || !selectedPage) {
      setPreviewOverflow(null)
      return
    }

    let cancelled = false
    void measureStageOverflow(root).then((result) => {
      if (cancelled) {
        return
      }
      if (result.status === "overflow") {
        setPreviewOverflow(
          `Preview overflow (${result.axes.join(" and ")}) — export still uses the ${CAPTURE_STAGE_SIZE_LABEL} capture stage`
        )
        return
      }
      setPreviewOverflow(null)
    })

    return () => {
      cancelled = true
    }
  }, [selectedPage, week])

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

  const toggleNotesPanel = () => {
    const panel = notesPanelRef.current
    if (!panel) {
      return
    }
    if (panel.isCollapsed()) {
      panel.expand()
      setNotesExpanded(true)
      return
    }
    panel.collapse()
    setNotesExpanded(false)
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

  const previewStage = (
    <div className="relative h-full min-h-0 min-w-0 overflow-hidden">
      <div className="stage-preview-slot absolute inset-0 flex items-center justify-center">
        <div className="stage-preview-fit">
          <StageFrame ref={previewStageRef}>
            {loading ? (
              <div className="stage-placeholder">Loading week…</div>
            ) : null}
            {!loading && emptyStore ? (
              <div className="stage-placeholder" role="status">
                {EMPTY_STORE_MESSAGE}
              </div>
            ) : null}
            {!loading && error ? (
              <div className="stage-warning" role="alert">
                {error}
              </div>
            ) : null}
            {!loading && selectedPage && week ? (
              <StageSlide
                page={selectedPage}
                context={createStagePageContext(week, selectedPage.id)}
              />
            ) : null}
          </StageFrame>
        </div>
      </div>
    </div>
  )

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
            weeks={weeks}
            selectedMonday={selectedMonday}
            onWeekChange={setSelectedMonday}
            week={week}
            editContent={editContent}
            metricControls={metricControls}
            trendControls={trendControls}
            selection={{
              pageIndex: selectedPageIndex,
              pageId: selectedPageId,
              onSelect: setSelectedPageIndex,
              onAdd: addPage,
              onDelete: deletePage,
              onMove: movePage,
            }}
            loadStatus={loadStatus}
            save={{
              saving: save.saving,
              message: save.message,
              error: save.error,
              onSave: () => void save.saveWeek(),
            }}
            create={{
              creating: create.creating,
              error: create.error,
              suggestedMonday,
              onCreate: (monday) => void create.createWeek(monday),
            }}
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
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                16:9 preview
              </h2>
              <ExportControls
                onDownloadAll={() => void downloadVisiblePages()}
                onCopy={() => void copyCurrentPage()}
                exporting={exporting}
                copying={copying}
                exportResult={exportResult}
                resultIsError={resultIsError}
                disabled={loading || !week}
              />
            </div>
            {previewOverflow ? (
              <p className="mb-3 text-xs text-muted-foreground" role="status">
                {previewOverflow}
              </p>
            ) : null}
            {week ? (
              <ResizablePanelGroup
                orientation="vertical"
                className="h-auto min-h-0 flex-1"
                id="preview-speaker-notes"
              >
                <ResizablePanel id="preview-stage" minSize="30%">
                  {previewStage}
                </ResizablePanel>
                <ResizableHandle withHandle aria-label="Resize speaker notes" />
                <ResizablePanel
                  id="preview-notes"
                  panelRef={notesPanelRef}
                  collapsible
                  collapsedSize="2.75rem"
                  defaultSize="12rem"
                  minSize="2.75rem"
                  groupResizeBehavior="preserve-pixel-size"
                  onResize={() => {
                    const expanded = !(
                      notesPanelRef.current?.isCollapsed() ?? false
                    )
                    setNotesExpanded((current) =>
                      current === expanded ? current : expanded
                    )
                  }}
                >
                  <SpeakerNotesCue
                    notes={selectedPage?.notes}
                    expanded={notesExpanded}
                    onToggle={toggleNotesPanel}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              <div className="min-h-0 flex-1">{previewStage}</div>
            )}
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
    </div>
  )
}
