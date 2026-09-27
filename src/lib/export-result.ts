import { formatBatchExportResult, type BatchExportResult } from "./week-export"

export type ExportResult =
  | { kind: "batch"; data: BatchExportResult }
  | { kind: "copy"; monday: string; pageId: string; error: string | null }

export type ExportResultSummary = { message: string; isError: boolean }

export function summarizeExportResult(
  result: ExportResult | null
): ExportResultSummary | null {
  if (!result) {
    return null
  }
  if (result.kind === "batch") {
    return {
      message: formatBatchExportResult(result.data),
      isError: result.data.stopReason !== null,
    }
  }
  if (result.error) {
    return {
      message: `Copy ${result.pageId} from ${result.monday}: ${result.error}`,
      isError: true,
    }
  }
  return {
    message: `Copied ${result.pageId} from ${result.monday} to clipboard.`,
    isError: false,
  }
}
