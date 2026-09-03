import type { RefObject } from "react"

import { StageFrame } from "@/components/stage/stage-frame"
import { StageSlide } from "@/components/stage/stage-slide"
import { Button } from "@/components/ui/button"
import type { WeekPage } from "@/lib/week-document"

type StageCaptureHostProps = {
  page: WeekPage | null
  monday: string
  hostRef: RefObject<HTMLDivElement | null>
}

export function StageCaptureHost({
  page,
  monday,
  hostRef,
}: StageCaptureHostProps) {
  if (!page) {
    return null
  }

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="pointer-events-none fixed opacity-0"
      style={{ left: -10000, top: 0, width: 1280 }}
    >
      <div className="w-[1280px]">
        <StageFrame>
          <StageSlide page={page} monday={monday} isCapture />
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
  clipboardError: string | null
  disabled?: boolean
}

export function ExportControls({
  onDownloadAll,
  onCopy,
  exporting,
  copying,
  exportError,
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
      {clipboardError ? (
        <p className="text-xs text-destructive" role="alert">
          {clipboardError}
        </p>
      ) : null}
    </div>
  )
}
