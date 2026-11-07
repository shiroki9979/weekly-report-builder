import { EditorialPageEditorChrome } from "@/components/workshop/editorial-page-editor-chrome"
import { PanelEditorForm } from "@/components/workshop/panel-editor-form"
import type { PageEditorProps } from "@/components/workshop/page-editor-props"
import type { FullWidthPanelPage } from "@/lib/deck"
import { issuePathsFor } from "@/lib/export-readiness"

export function FullWidthPanelEditorForm(
  props: PageEditorProps<FullWidthPanelPage>
) {
  const invalidPaths = issuePathsFor(props.page)
  return (
    <EditorialPageEditorChrome {...props} invalidPaths={invalidPaths}>
      <PanelEditorForm
        {...props}
        panel={props.page.panel}
        invalidPaths={invalidPaths}
      />
    </EditorialPageEditorChrome>
  )
}
