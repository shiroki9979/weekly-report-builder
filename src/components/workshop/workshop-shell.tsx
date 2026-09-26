import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"
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
import {
  MetricDraftProvider,
  useMetricDraft,
} from "@/components/workshop/metric-draft-context"
import { PageEditorForm } from "@/components/workshop/page-editor-form"
import { PageLifecycleControls } from "@/components/workshop/page-lifecycle-controls"
import { PageNavigator } from "@/components/workshop/page-navigator"
import { SpeakerNotesCue } from "@/components/workshop/speaker-notes-cue"
import { PagePicker, WorkshopToolbar } from "@/components/workshop/week-picker"
import { useStageExport } from "@/hooks/use-stage-export"
import { usePageKeyboardNav } from "@/hooks/use-page-keyboard-nav"
import { useWeekEditor } from "@/hooks/use-week-editor"
import { weekHasInvalidMetricDrafts } from "@/lib/metric-draft-buffer"
import { measureStageOverflow } from "@/lib/overflow-measurement"
import type { PageLifecycleResult } from "@/lib/page-lifecycle"
import { createStagePageContext } from "@/lib/stage-page-context"
import type { WeekDocument } from "@/lib/week-document"
import { setWeekShowPageNumbers } from "@/lib/week-editor"

export const EMPTY_STORE_MESSAGE =
  "weeks/ has no Week Documents. Remove an empty weeks/ directory if it exists, then run pnpm seed:weeks."

type EditorSidebarProps = {
  weeks: string[]
  selectedMonday: string
  onWeekChange: (monday: string) => void
  week: WeekDocument | null
  setWeek: Dispatch<SetStateAction<WeekDocument | null>>
  selectedPageIndex: number
  selectedPageId: string | null
  onPageSelect: (index: number) => void
  onPageLifecycle: (result: PageLifecycleResult) => void
  loading: boolean
  saving: boolean
  saveError: string | null
  saveMessage: string | null
  onSave: () => void
  creating: boolean
  createError: string | null
  suggestedMonday: string
  onCreateWeek: (monday: string) => void
  emptyStore: boolean
}

/** 週次切換時以 key remount，editMode 自動回到鎖定 */
function EditorSidebar({
  weeks,
  selectedMonday,
  onWeekChange,
  week,
  setWeek,
  selectedPageIndex,
  selectedPageId,
  onPageSelect,
  onPageLifecycle,
  loading,
  saving,
  saveError,
  saveMessage,
  onSave,
  creating,
  createError,
  suggestedMonday,
  onCreateWeek,
  emptyStore,
}: EditorSidebarProps) {
  const [editMode, setEditMode] = useState(false)

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

        {emptyStore ? (
          // 空 store 只說明如何 seed，不提供建立第一週
          <p className="text-sm text-muted-foreground" role="status">
            {EMPTY_STORE_MESSAGE}
          </p>
        ) : (
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
            showPageNumbers={week?.showPageNumbers ?? true}
            showPageNumbersDisabled={loading || !week || !editMode}
            onShowPageNumbersChange={(show) =>
              setWeek((current) =>
                current ? setWeekShowPageNumbers(current, show) : null
              )
            }
          />
        )}

        {week ? (
          <>
            <PagePicker
              week={week}
              selectedPageIndex={selectedPageIndex}
              onSelect={onPageSelect}
            />
            {selectedPageId ? (
              <PageLifecycleControls
                week={week}
                selectedPageId={selectedPageId}
                onChange={onPageLifecycle}
                disabled={!editMode}
              />
            ) : null}
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
  return (
    <MetricDraftProvider>
      <WorkshopShellBody />
    </MetricDraftProvider>
  )
}

function WorkshopShellBody() {
  const { buffer } = useMetricDraft()
  const [draftSaveError, setDraftSaveError] = useState<string | null>(null)
  const {
    weeks,
    selectedMonday,
    setSelectedMonday,
    week,
    setWeek,
    selectedPageIndex,
    setSelectedPageIndex,
    selectedPageId,
    setSelectedPageId,
    loadStatus,
    saving,
    saveError,
    saveMessage,
    saveWeek,
    creating,
    createError,
    suggestedMonday,
    createWeek,
  } = useWeekEditor()

  const loading = loadStatus.kind === "loading"
  const emptyStore = loadStatus.kind === "empty"
  const error = loadStatus.kind === "error" ? loadStatus.message : null

  const selectedPage = week?.pages[selectedPageIndex] ?? null
  const captureHostRef = useRef<HTMLDivElement>(null)
  const previewStageRef = useRef<HTMLDivElement>(null)
  const {
    capturePage,
    exporting,
    copying,
    exportError,
    exportWarning,
    clipboardError,
    downloadVisiblePages,
    copyCurrentPage,
  } = useStageExport({
    monday: selectedMonday,
    week,
    selectedPage,
    captureHostRef,
    metricBuffer: buffer,
  })

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
          `Preview overflow (${result.axes.join(" and ")}) — export still uses the 1280 × 720 capture stage`
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
            setWeek={setWeek}
            selectedPageIndex={selectedPageIndex}
            selectedPageId={selectedPageId}
            onPageSelect={setSelectedPageIndex}
            onPageLifecycle={(result) => {
              setWeek(result.week)
              setSelectedPageId(result.selectedPageId)
            }}
            loading={loading}
            saving={saving}
            saveError={saveError ?? draftSaveError}
            saveMessage={saveMessage}
            onSave={() => {
              if (week && weekHasInvalidMetricDrafts(week, buffer)) {
                setDraftSaveError("Fix invalid metric values before saving")
                return
              }
              setDraftSaveError(null)
              void saveWeek()
            }}
            creating={creating}
            createError={createError}
            suggestedMonday={suggestedMonday}
            onCreateWeek={(monday) => void createWeek(monday)}
            emptyStore={emptyStore}
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
                exportError={exportError}
                exportWarning={exportWarning}
                clipboardError={clipboardError}
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
      <StageCaptureHost
        page={capturePage}
        week={week}
        hostRef={captureHostRef}
      />
    </div>
  )
}
