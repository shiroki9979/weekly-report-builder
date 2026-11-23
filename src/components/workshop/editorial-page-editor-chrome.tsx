import type { ReactNode } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ContentReadinessSummary } from "@/components/workshop/content-readiness-summary"
import { PageNumberSelect } from "@/components/workshop/page-number-select"
import {
  isCoverPage,
  isEditorialFramePage,
  type EditorialFramePage,
} from "@/lib/deck"
import type { ExportIssue } from "@/lib/export-readiness"
import { defaultEyebrow } from "@/lib/page-chrome"
import {
  setPageBoundary,
  setPageEyebrow,
  setPageHidden,
  setPageNotes,
  setPageTitle,
} from "@/lib/deck-editor"
import type { PageEditorProps } from "@/components/workshop/page-editor-props"

type EditorialPageEditorChromeProps = PageEditorProps & {
  invalidPaths: Set<string>
  readinessIssues?: ExportIssue[]
  children: ReactNode
}

/** Editorial Frame 頁面與 Cover 共用 Title／notes／Hide，避免各 form 各寫一份 chrome */
export function EditorialPageEditorChrome({
  deck,
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
              onChange((currentDeck) =>
                setPageTitle(currentDeck, pageIndex, event.target.value)
              )
            }
          />
        </div>
        {/* Eyebrow 在版型欄位之上、Boundary Note 在其下，對應 Stage 由上而下的順序，
            兩者夾著 children 無法併成同一個條件區塊 */}
        {isEditorialFramePage(page) ? (
          <EyebrowField page={page} pageIndex={pageIndex} onChange={onChange} />
        ) : null}
        {children}
        {isEditorialFramePage(page) ? (
          <BoundaryNoteField
            page={page}
            pageIndex={pageIndex}
            onChange={onChange}
          />
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="speaker-notes">Speaker notes</Label>
          <Textarea
            id="speaker-notes"
            value={page.notes ?? ""}
            onChange={(event) =>
              onChange((currentDeck) =>
                setPageNotes(currentDeck, pageIndex, event.target.value)
              )
            }
          />
        </div>
        {!isCoverPage(page) ? (
          <PageNumberSelect
            deck={deck}
            pageIndex={pageIndex}
            disabled={readOnly}
            onChange={onChange}
          />
        ) : null}
        <div className="flex items-center gap-2">
          <Checkbox
            id="page-hidden"
            checked={page.hidden ?? false}
            onCheckedChange={(checked) =>
              onChange((currentDeck) =>
                setPageHidden(currentDeck, pageIndex, checked === true)
              )
            }
          />
          <Label htmlFor="page-hidden">Hide page from export</Label>
        </div>
      </fieldset>
    </form>
  )
}

type EditorialFrameFieldProps = Pick<
  PageEditorProps<EditorialFramePage>,
  "page" | "pageIndex" | "onChange"
>

function EyebrowField({ page, pageIndex, onChange }: EditorialFrameFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="page-eyebrow">Eyebrow</Label>
      <Input
        id="page-eyebrow"
        value={page.eyebrow ?? ""}
        placeholder={eyebrowPlaceholder(page)}
        onChange={(event) =>
          onChange((currentDeck) =>
            setPageEyebrow(currentDeck, pageIndex, event.target.value)
          )
        }
      />
    </div>
  )
}

function BoundaryNoteField({
  page,
  pageIndex,
  onChange,
}: EditorialFrameFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="page-boundary">Boundary Note</Label>
      <Textarea
        id="page-boundary"
        value={page.boundary ?? ""}
        placeholder="Scope, verification, or limit"
        onChange={(event) =>
          onChange((currentDeck) =>
            setPageBoundary(currentDeck, pageIndex, event.target.value)
          )
        }
      />
    </div>
  )
}

// 與 Stage 共用同一份預設詞，留空時 placeholder 就是 Stage 會顯示的詞；
// Two-column 沒有預設詞，改提示留空是合法狀態
const NO_DEFAULT_EYEBROW_HINT = "Optional; no default eyebrow"

function eyebrowPlaceholder(page: EditorialFramePage): string {
  return defaultEyebrow(page.layout) || NO_DEFAULT_EYEBROW_HINT
}
