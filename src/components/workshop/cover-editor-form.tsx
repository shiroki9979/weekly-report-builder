import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EditorialPageEditorChrome } from "@/components/workshop/editorial-page-editor-chrome"
import type { PageEditorProps } from "@/components/workshop/page-editor-props"
import type { CoverPage } from "@/lib/deck"
import { issuePathsFor } from "@/lib/export-readiness"
import { setCoverFields } from "@/lib/cover-editor"

export function CoverEditorForm(props: PageEditorProps<CoverPage>) {
  const { page, pageIndex, onChange } = props
  return (
    <EditorialPageEditorChrome {...props} invalidPaths={issuePathsFor(page)}>
      <div className="space-y-2">
        <Label htmlFor="cover-subtitle">Subtitle</Label>
        <Input
          id="cover-subtitle"
          value={page.subtitle}
          onChange={(event) =>
            onChange((deck) =>
              setCoverFields(deck, pageIndex, { subtitle: event.target.value })
            )
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cover-byline">Byline</Label>
        <Input
          id="cover-byline"
          value={page.byline}
          onChange={(event) =>
            onChange((deck) =>
              setCoverFields(deck, pageIndex, { byline: event.target.value })
            )
          }
        />
      </div>
    </EditorialPageEditorChrome>
  )
}
