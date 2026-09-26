import type { RefObject } from "react"

import { StageFrame } from "@/components/stage/stage-frame"
import { StageSlide } from "@/components/stage/stage-slide"
import { Button } from "@/components/ui/button"
import { CAPTURE_STAGE_WIDTH } from "@/lib/overflow-measurement"
import { createStagePageContext } from "@/lib/stage-page-context"
import type { WeekDocument, WeekPage } from "@/lib/week-document"

// 移到視窗外但保留排版，截圖與 overflow 量測才拿得到實際尺寸
const OFFSCREEN_LEFT_PX = -10000

type StageCaptureHostProps = {
  page: WeekPage | null
  week: WeekDocument | null
  hostRef: RefObject<HTMLDivElement | null>
}

export function StageCaptureHost({
  page,
  week,
  hostRef,
}: StageCaptureHostProps) {
  if (!page || !week) {
    return null
  }

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="pointer-events-none fixed opacity-0"
      style={{ left: OFFSCREEN_LEFT_PX, top: 0, width: CAPTURE_STAGE_WIDTH }}
    >
      <div style={{ width: CAPTURE_STAGE_WIDTH }}>
        <StageFrame>
          <StageSlide
            page={page}
            context={createStagePageContext(week, page.id)}
            isCapture
          />
        </StageFrame>
      </div>
    </div>
  )
}

type ExportControlsProps = {
  onDownloadAll: () => void
  onCopy: () => void
  exporting: boolean
  copying: boolean
  exportError: string | null
  exportWarning: string | null
  clipboardError: string | null
  disabled?: boolean
}

export function ExportControls({
  onDownloadAll,
  onCopy,
  exporting,
  copying,
  exportError,
  exportWarning,
  clipboardError,
  disabled,
}: ExportControlsProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDownloadAll}
          disabled={disabled || exporting || copying}
        >
          {exporting ? "Exporting…" : "Download PNGs"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCopy}
          disabled={disabled || exporting || copying}
        >
          {copying ? "Copying…" : "Copy to clipboard"}
        </Button>
      </div>
      {exportError ? (
        <p className="text-xs text-destructive" role="alert">
          {exportError}
        </p>
      ) : null}
      {exportWarning ? (
        <p className="text-xs text-muted-foreground" role="status">
          {exportWarning}
        </p>
      ) : null}
      {clipboardError ? (
        <p className="text-xs text-destructive" role="alert">
          {clipboardError}
        </p>
      ) : null}
    </div>
  )
}
