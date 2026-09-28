import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react"
import { usePanelRef } from "react-resizable-panels"

import { StageFrame } from "@/components/stage/stage-frame"
import { StageSlide } from "@/components/stage/stage-slide"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { EMPTY_STORE_MESSAGE } from "@/components/workshop/empty-store-message"
import { ExportControls } from "@/components/workshop/export-controls"
import { PageNavigator } from "@/components/workshop/page-navigator"
import { SpeakerNotesCue } from "@/components/workshop/speaker-notes-cue"
import { useStageExport } from "@/hooks/use-stage-export"
import type {
  SessionLoadStatus,
  SessionOperationSnapshot,
} from "@/lib/editing-session"
import {
  CAPTURE_STAGE_SIZE_LABEL,
  measureStageOverflow,
} from "@/lib/overflow-measurement"
import { createStagePageContext } from "@/lib/stage-page-context"
import type { WeekDocument, WeekPage } from "@/lib/week-document"

type WorkshopPreviewProps = {
  week: WeekDocument | null
  selectedPageIndex: number
  onSelectPage: (index: number) => void
  loadStatus: SessionLoadStatus
  operationSnapshot: () => SessionOperationSnapshot | null
}

export function WorkshopPreview({
  week,
  selectedPageIndex,
  onSelectPage,
  loadStatus,
  operationSnapshot,
}: WorkshopPreviewProps) {
  const loading = loadStatus.kind === "loading"
  const selectedPage = week?.pages[selectedPageIndex] ?? null
  const stageRef = useRef<HTMLDivElement>(null)
  const previewOverflow = usePreviewOverflow(stageRef, selectedPage, week)
  const stage = (
    <PreviewStage
      stageRef={stageRef}
      loadStatus={loadStatus}
      week={week}
      selectedPage={selectedPage}
    />
  )

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-4">
      <PreviewToolbar
        operationSnapshot={operationSnapshot}
        disabled={loading || !week}
      />
      {previewOverflow ? (
        <p className="mb-3 text-xs text-muted-foreground" role="status">
          {previewOverflow}
        </p>
      ) : null}
      {week ? (
        <StageWithSpeakerNotes stage={stage} notes={selectedPage?.notes} />
      ) : (
        <div className="min-h-0 flex-1">{stage}</div>
      )}
      {week ? (
        <PageNavigator
          pages={week.pages}
          selectedPageIndex={selectedPageIndex}
          onSelect={onSelectPage}
          disabled={loading}
        />
      ) : null}
    </div>
  )
}

// 預覽框依剩餘空間縮放，可能比 capture stage 擠；只提示，實際匯出仍以 capture stage 量測為準
function usePreviewOverflow(
  stageRef: RefObject<HTMLDivElement | null>,
  selectedPage: WeekPage | null,
  week: WeekDocument | null
): string | null {
  const [previewOverflow, setPreviewOverflow] = useState<string | null>(null)

  useEffect(() => {
    const root = stageRef.current
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
  }, [stageRef, selectedPage, week])

  return previewOverflow
}

function PreviewToolbar({
  operationSnapshot,
  disabled,
}: {
  operationSnapshot: () => SessionOperationSnapshot | null
  disabled: boolean
}) {
  const {
    exporting,
    copying,
    exportResult,
    resultIsError,
    downloadVisiblePages,
    copyCurrentPage,
  } = useStageExport({ operationSnapshot })

  return (
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
        disabled={disabled}
      />
    </div>
  )
}

function PreviewStage({
  stageRef,
  loadStatus,
  week,
  selectedPage,
}: {
  stageRef: RefObject<HTMLDivElement | null>
  loadStatus: SessionLoadStatus
  week: WeekDocument | null
  selectedPage: WeekPage | null
}) {
  const loading = loadStatus.kind === "loading"
  return (
    <div className="relative h-full min-h-0 min-w-0 overflow-hidden">
      <div className="stage-preview-slot absolute inset-0 flex items-center justify-center">
        <div className="stage-preview-fit">
          <StageFrame ref={stageRef}>
            {loading ? (
              <div className="stage-placeholder">Loading week…</div>
            ) : null}
            {!loading && loadStatus.kind === "empty" ? (
              <div className="stage-placeholder" role="status">
                {EMPTY_STORE_MESSAGE}
              </div>
            ) : null}
            {!loading && loadStatus.kind === "error" ? (
              <div className="stage-warning" role="alert">
                {loadStatus.message}
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
}

// 面板可由拖曳或標題列收合；兩種來源都要同步回 Speaker notes 的展開狀態
function StageWithSpeakerNotes({
  stage,
  notes,
}: {
  stage: ReactNode
  notes: string | undefined
}) {
  const notesPanelRef = usePanelRef()
  const [notesExpanded, setNotesExpanded] = useState(true)

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

  return (
    <ResizablePanelGroup
      orientation="vertical"
      className="h-auto min-h-0 flex-1"
      id="preview-speaker-notes"
    >
      <ResizablePanel id="preview-stage" minSize="30%">
        {stage}
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
          const expanded = !(notesPanelRef.current?.isCollapsed() ?? false)
          setNotesExpanded((current) =>
            current === expanded ? current : expanded
          )
        }}
      >
        <SpeakerNotesCue
          notes={notes}
          expanded={notesExpanded}
          onToggle={toggleNotesPanel}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
