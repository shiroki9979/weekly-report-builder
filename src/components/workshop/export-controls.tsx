import { Button } from "@/components/ui/button"

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
