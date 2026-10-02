import { contentReadinessHeading } from "@/lib/content-readiness-copy"
import {
  assessContentReadiness,
  formatExportIssue,
  type ExportIssue,
} from "@/lib/export-readiness"
import { isStructuredPage, type Page } from "@/lib/deck"

type ContentReadinessSummaryProps = {
  page: Page
  issues?: ExportIssue[]
}

export function ContentReadinessSummary({
  page,
  issues: suppliedIssues,
}: ContentReadinessSummaryProps) {
  if (!isStructuredPage(page)) {
    return null
  }

  const issues = suppliedIssues ?? assessContentReadiness(page)
  if (issues.length === 0) {
    return null
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="space-y-2 rounded-md border p-3"
    >
      <p className="text-sm font-medium">{contentReadinessHeading(issues)}</p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {issues.map((issue) => (
          <li key={`${issue.code}:${issue.path ?? issue.message}`}>
            {formatExportIssue(issue)}
          </li>
        ))}
      </ul>
    </div>
  )
}
