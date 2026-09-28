import { useState } from "react"
import { LockIcon, PencilIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { EMPTY_STORE_MESSAGE } from "@/components/workshop/empty-store-message"
import { PageEditorForm } from "@/components/workshop/page-editor-form"
import { PageLifecycleControls } from "@/components/workshop/page-lifecycle-controls"
import { PagePicker } from "@/components/workshop/page-picker"
import { WorkshopHeader } from "@/components/workshop/workshop-header"
import { WorkshopPreview } from "@/components/workshop/workshop-preview"
import {
  WorkshopToolbar,
  type ToolbarCreateControls,
  type ToolbarSaveControls,
} from "@/components/workshop/workshop-toolbar"
import { useCollapsiblePanel } from "@/hooks/use-collapsible-panel"
import { usePageKeyboardNav } from "@/hooks/use-page-keyboard-nav"
import {
  useEditingSession,
  type LayoutEditorControls,
} from "@/hooks/use-editing-session"
import type { WeekDocument, WeekPage } from "@/lib/week-document"
import type { WeekStore } from "@/lib/week-store"
import type { SessionLoadStatus } from "@/lib/editing-session"
import type { PageMoveDirection } from "@/lib/page-lifecycle"
import { setWeekShowPageNumbers } from "@/lib/week-editor"

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
  layoutControls: LayoutEditorControls
  selection: PageSelection
  loadStatus: SessionLoadStatus
  save: ToolbarSaveControls
  create: ToolbarCreateControls
}

function SidebarModeHeader({
  editMode,
  disabled,
  onToggle,
}: {
  editMode: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
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
        disabled={disabled}
        aria-pressed={editMode}
        onClick={onToggle}
      >
        {editMode ? <LockIcon /> : <PencilIcon />}
        {editMode ? "Lock" : "Edit"}
      </Button>
    </div>
  )
}

/** 週次切換時以 key remount，editMode 自動回到鎖定 */
function EditorSidebar({
  weeks,
  selectedMonday,
  onWeekChange,
  week,
  editContent,
  layoutControls,
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
        <SidebarModeHeader
          editMode={editMode}
          disabled={loading || !week}
          onToggle={() => setEditMode((current) => !current)}
        />

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
              layoutControls={layoutControls}
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
  const session = useEditingSession(weekStore)
  const { week, loadStatus, selectedPageIndex, setSelectedPageIndex } = session
  const editorPanel = useCollapsiblePanel()

  usePageKeyboardNav({
    pageCount: week?.pages.length ?? 0,
    selectedPageIndex,
    onSelect: setSelectedPageIndex,
    enabled: loadStatus.kind !== "loading" && week !== null,
  })

  return (
    <div className="flex h-svh min-h-0 flex-col bg-background">
      <WorkshopHeader
        week={week}
        editorCollapsed={editorPanel.collapsed}
        onToggleEditor={editorPanel.toggle}
      />
      <ResizablePanelGroup
        orientation="horizontal"
        className="min-h-0 flex-1"
        id="weekly-workshop-panels"
      >
        <ResizablePanel
          id="editor"
          panelRef={editorPanel.panelRef}
          collapsible
          collapsedSize={0}
          defaultSize="42"
          minSize="20"
          maxSize="60"
          onResize={editorPanel.syncCollapsed}
        >
          <EditorSidebar
            key={session.selectedMonday}
            weeks={session.weeks}
            selectedMonday={session.selectedMonday}
            onWeekChange={session.setSelectedMonday}
            week={week}
            editContent={session.editContent}
            layoutControls={session.layoutControls}
            selection={{
              pageIndex: selectedPageIndex,
              pageId: session.selectedPageId,
              onSelect: setSelectedPageIndex,
              onAdd: session.addPage,
              onDelete: session.deletePage,
              onMove: session.movePage,
            }}
            loadStatus={loadStatus}
            save={{
              saving: session.save.saving,
              message: session.save.message,
              error: session.save.error,
              onSave: () => void session.save.saveWeek(),
            }}
            create={{
              creating: session.create.creating,
              error: session.create.error,
              suggestedMonday: session.suggestedMonday,
              onCreate: (monday) => void session.create.createWeek(monday),
            }}
          />
        </ResizablePanel>

        <ResizableHandle withHandle disabled={editorPanel.collapsed} />

        <ResizablePanel
          id="preview"
          defaultSize="58"
          minSize="40"
          groupResizeBehavior="preserve-relative-size"
        >
          <WorkshopPreview
            week={week}
            selectedPageIndex={selectedPageIndex}
            onSelectPage={setSelectedPageIndex}
            loadStatus={loadStatus}
            operationSnapshot={session.operationSnapshot}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
