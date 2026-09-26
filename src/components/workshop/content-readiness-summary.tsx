import type { MetricDraftBuffer } from "@/lib/metric-draft-buffer"
import { contentReadinessHeading } from "@/lib/content-readiness-copy"
import { assessContentReadiness } from "@/lib/export-readiness"
import { isStructuredWeekPage, type WeekPage } from "@/lib/week-document"

type ContentReadinessSummaryProps = {
  page: WeekPage
  metricBuffer?: MetricDraftBuffer
}

export function ContentReadinessSummary({
  page,
  metricBuffer = {},
}: ContentReadinessSummaryProps) {
  if (!isStructuredWeekPage(page)) {
    return null
  }

  const issues = assessContentReadiness(page, metricBuffer)
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
            {issue.path ? `${issue.path}: ${issue.message}` : issue.message}
          </li>
        ))}
      </ul>
    </div>
  )
}
