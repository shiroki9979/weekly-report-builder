import { Button } from "@/components/ui/button"

type ExportControlsProps = {
  onDownloadAll: () => void
  onCopy: () => void
  exporting: boolean
  copying: boolean
  exportResult: string | null
  resultIsError: boolean
  disabled?: boolean
}

export function ExportControls({
  onDownloadAll,
  onCopy,
  exporting,
  copying,
  exportResult,
  resultIsError,
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
      {exportResult ? (
        <p
          className={`text-xs ${resultIsError ? "text-destructive" : "text-muted-foreground"}`}
          role={resultIsError ? "alert" : "status"}
        >
          {exportResult}
        </p>
      ) : null}
    </div>
  )
}
