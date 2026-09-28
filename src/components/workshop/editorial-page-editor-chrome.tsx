import type { ReactNode } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ContentReadinessSummary } from "@/components/workshop/content-readiness-summary"
import { PageNumberSelect } from "@/components/workshop/page-number-select"
import type { ExportIssue } from "@/lib/export-readiness"
import { setPageHidden, setPageNotes, setPageTitle } from "@/lib/week-editor"
import type { PageEditorProps } from "@/components/workshop/page-editor-props"

type EditorialPageEditorChromeProps = PageEditorProps & {
  invalidPaths: Set<string>
  readinessIssues?: ExportIssue[]
  children: ReactNode
}

/** Editorial Layout Family 共用 Title／notes／Hide，避免各 form 各寫一份 chrome */
export function EditorialPageEditorChrome({
  week,
  pageIndex,
  page,
  onChange,
  readOnly = false,
  invalidPaths,
  readinessIssues,
  children,
}: EditorialPageEditorChromeProps) {
  return (
    <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
      <ContentReadinessSummary page={page} issues={readinessIssues} />
      <fieldset
        disabled={readOnly}
        className="min-w-0 space-y-4 border-0 p-0 disabled:opacity-60"
      >
        <div className="space-y-2">
          <Label htmlFor="page-title">Title</Label>
          <Input
            id="page-title"
            value={page.title}
            aria-invalid={invalidPaths.has("title") || undefined}
            onChange={(event) =>
              onChange((currentWeek) =>
                setPageTitle(currentWeek, pageIndex, event.target.value)
              )
            }
          />
        </div>
        {children}
        <div className="space-y-2">
          <Label htmlFor="speaker-notes">Speaker notes</Label>
          <Textarea
            id="speaker-notes"
            value={page.notes ?? ""}
            onChange={(event) =>
              onChange((currentWeek) =>
                setPageNotes(currentWeek, pageIndex, event.target.value)
              )
            }
          />
        </div>
        <PageNumberSelect
          week={week}
          pageIndex={pageIndex}
          disabled={readOnly}
          onChange={onChange}
        />
        <div className="flex items-center gap-2">
          <Checkbox
            id="page-hidden"
            checked={page.hidden ?? false}
            onCheckedChange={(checked) =>
              onChange((currentWeek) =>
                setPageHidden(currentWeek, pageIndex, checked === true)
              )
            }
          />
          <Label htmlFor="page-hidden">Hide page from export</Label>
        </div>
      </fieldset>
    </form>
  )
}
