import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react"

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
import { useCollapsiblePanel } from "@/hooks/use-collapsible-panel"
import { useStageExport } from "@/hooks/use-stage-export"
import type {
  SessionLoadStatus,
  SessionOperationSnapshot,
} from "@/lib/editing-session"
import { errorMessage } from "@/lib/error-message"
import {
  CAPTURE_STAGE_SIZE_LABEL,
  measureStageOverflow,
  type OverflowMeasurement,
} from "@/lib/overflow-measurement"
import { createStagePageContext } from "@/lib/stage-page-context"
import type { Deck, Page } from "@/lib/deck"

type WorkshopPreviewProps = {
  documentId: string
  deck: Deck | null
  selectedPageIndex: number
  onSelectPage: (index: number) => void
  loadStatus: SessionLoadStatus
  operationSnapshot: () => SessionOperationSnapshot | null
}

export function WorkshopPreview({
  documentId,
  deck,
  selectedPageIndex,
  onSelectPage,
  loadStatus,
  operationSnapshot,
}: WorkshopPreviewProps) {
  const loading = loadStatus.kind === "loading"
  const selectedPage = deck?.pages[selectedPageIndex] ?? null
  const stageRef = useRef<HTMLDivElement>(null)
  const previewNotice = usePreviewMeasurementNotice(
    stageRef,
    selectedPage,
    deck
  )
  const stage = (
    <PreviewStage
      stageRef={stageRef}
      loadStatus={loadStatus}
      documentId={documentId}
      deck={deck}
      selectedPage={selectedPage}
    />
  )

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-4">
      <PreviewToolbar
        operationSnapshot={operationSnapshot}
        disabled={loading || !deck}
      />
      {previewNotice ? (
        <p className="mb-3 text-xs text-muted-foreground" role="status">
          {previewNotice}
        </p>
      ) : null}
      {deck ? (
        <StageWithSpeakerNotes stage={stage} notes={selectedPage?.notes} />
      ) : (
        <div className="min-h-0 flex-1">{stage}</div>
      )}
      {deck ? (
        <PageNavigator
          pages={deck.pages}
          selectedPageIndex={selectedPageIndex}
          onSelect={onSelectPage}
          disabled={loading}
        />
      ) : null}
    </div>
  )
}

// 預覽框依剩餘空間縮放，可能比 capture stage 擠；只提示，實際匯出仍以 capture stage 量測為準
function usePreviewMeasurementNotice(
  stageRef: RefObject<HTMLDivElement | null>,
  selectedPage: Page | null,
  deck: Deck | null
): string | null {
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const root = stageRef.current
    if (!root || !selectedPage) {
      setNotice(null)
      return
    }

    let cancelled = false
    const show = (next: string | null) => {
      if (!cancelled) setNotice(next)
    }
    measureStageOverflow(root)
      .then((result) => show(previewMeasurementNotice(result)))
      .catch((cause: unknown) =>
        show(
          measurementFailedNotice(
            errorMessage(cause, "Preview measurement failed")
          )
        )
      )

    return () => {
      cancelled = true
    }
  }, [stageRef, selectedPage, deck])

  return notice
}

// 量測失敗不能當成 fit 靜默帶過；作者需要知道預覽的 overflow 提示此刻不可信
function previewMeasurementNotice(result: OverflowMeasurement): string | null {
  if (result.status === "overflow")
    return `Preview overflow (${result.axes.join(" and ")}) — export still uses the ${CAPTURE_STAGE_SIZE_LABEL} capture stage`
  if (result.status === "measurement-failed")
    return measurementFailedNotice(result.message)
  return null
}

function measurementFailedNotice(message: string): string {
  return `Preview measurement failed: ${message} — export measures the ${CAPTURE_STAGE_SIZE_LABEL} capture stage again`
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
  documentId,
  deck,
  selectedPage,
}: {
  stageRef: RefObject<HTMLDivElement | null>
  loadStatus: SessionLoadStatus
  documentId: string
  deck: Deck | null
  selectedPage: Page | null
}) {
  const loading = loadStatus.kind === "loading"
  return (
    <div className="relative h-full min-h-0 min-w-0 overflow-hidden">
      <div className="stage-preview-slot absolute inset-0 flex items-center justify-center">
        <div className="stage-preview-fit">
          <StageFrame ref={stageRef}>
            {loading ? (
              <div className="stage-placeholder">Loading deck…</div>
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
            {!loading && selectedPage && deck ? (
              <StageSlide
                page={selectedPage}
                context={createStagePageContext(
                  documentId,
                  deck,
                  selectedPage.id
                )}
              />
            ) : null}
          </StageFrame>
        </div>
      </div>
    </div>
  )
}

function StageWithSpeakerNotes({
  stage,
  notes,
}: {
  stage: ReactNode
  notes: string | undefined
}) {
  const notesPanel = useCollapsiblePanel()

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
        panelRef={notesPanel.panelRef}
        collapsible
        collapsedSize="2.75rem"
        defaultSize="12rem"
        // 展開下限需高於收合高度，縮放時的百分比捨入誤差才會被吸附回收合尺寸。
        minSize="6rem"
        groupResizeBehavior="preserve-pixel-size"
        onResize={notesPanel.syncCollapsed}
      >
        <SpeakerNotesCue
          notes={notes}
          expanded={!notesPanel.collapsed}
          onToggle={notesPanel.toggle}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
