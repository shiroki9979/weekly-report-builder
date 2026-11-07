import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CoverEditorForm } from "@/components/workshop/cover-editor-form"
import { SideBySideEditorForm } from "@/components/workshop/side-by-side-editor-form"
import { ClosingEditorForm } from "@/components/workshop/closing-editor-form"
import { ContentReadinessSummary } from "@/components/workshop/content-readiness-summary"
import { EvidenceDecisionEditorForm } from "@/components/workshop/evidence-decision-editor-form"
import { NextActionsEditorForm } from "@/components/workshop/next-actions-editor-form"
import type { PageEditorProps } from "@/components/workshop/page-editor-props"
import { PanelEditorForm } from "@/components/workshop/panel-editor-form"
import { FullWidthPanelEditorForm } from "@/components/workshop/full-width-panel-editor-form"
import type { LayoutEditorControls } from "@/hooks/use-editing-session"
import { PageNumberSelect } from "@/components/workshop/page-number-select"
import { OverviewEditorForm } from "@/components/workshop/overview-editor-form"
import { TrendTargetEditorForm } from "@/components/workshop/trend-target-editor-form"
import { issuePathsFor } from "@/lib/export-readiness"
import {
  setPageHidden,
  setPageHtmlFile,
  setPageItem,
  setPageNotes,
  setPageTitle,
} from "@/lib/deck-editor"
import { matchPage, type HtmlPage, type TwoColumnPage } from "@/lib/deck"

type PageEditorFormProps = Omit<PageEditorProps, "page"> & {
  layoutControls: LayoutEditorControls
}

export function PageEditorForm({
  deck,
  pageIndex,
  onChange,
  layoutControls,
  readOnly = false,
}: PageEditorFormProps) {
  const page = deck.pages[pageIndex]

  if (!page) {
    return null
  }

  const editor = { deck, pageIndex, onChange, readOnly }

  return matchPage(page, {
    fullWidthPanel: (fullWidth) => (
      <FullWidthPanelEditorForm {...editor} page={fullWidth} />
    ),
    cover: (cover) => <CoverEditorForm {...editor} page={cover} />,
    closing: (closing) => <ClosingEditorForm {...editor} page={closing} />,
    sideBySide: (comparison) => (
      <SideBySideEditorForm {...editor} page={comparison} />
    ),
    html: (htmlPage) => <HtmlPageEditorForm {...editor} page={htmlPage} />,
    overview: (overview) => <OverviewEditorForm {...editor} page={overview} />,
    evidenceDecision: (decision) => (
      <EvidenceDecisionEditorForm
        {...editor}
        page={decision}
        metricControls={layoutControls.evidenceDecision}
      />
    ),
    nextActions: (actions) => (
      <NextActionsEditorForm {...editor} page={actions} />
    ),
    trendTarget: (trend) => (
      <TrendTargetEditorForm
        {...editor}
        page={trend}
        trendControls={layoutControls.trendTarget}
      />
    ),
    unknown: () => (
      <p className="text-sm text-muted-foreground" role="status">
        This layout is not editable yet.
      </p>
    ),
    twoColumn: (twoColumn) => (
      <TwoColumnPageEditorForm {...editor} page={twoColumn} />
    ),
  })
}

function HtmlPageEditorForm({
  deck,
  pageIndex,
  page,
  onChange,
  readOnly = false,
}: PageEditorProps<HtmlPage>) {
  return (
    <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
      <fieldset
        disabled={readOnly}
        className="min-w-0 space-y-4 border-0 p-0 disabled:opacity-60"
      >
        <div className="space-y-2">
          <Label htmlFor="page-title">Title</Label>
          <Input
            id="page-title"
            value={page.title}
            onChange={(event) =>
              onChange((currentDeck) =>
                setPageTitle(currentDeck, pageIndex, event.target.value)
              )
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="page-html-file">HTML file</Label>
          <Input
            id="page-html-file"
            value={page.htmlFile}
            onChange={(event) =>
              onChange((currentDeck) =>
                setPageHtmlFile(currentDeck, pageIndex, event.target.value)
              )
            }
          />
        </div>

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

        <PageNumberSelect
          deck={deck}
          pageIndex={pageIndex}
          disabled={readOnly}
          onChange={onChange}
        />

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

function TwoColumnPageEditorForm({
  deck,
  pageIndex,
  page,
  onChange,
  readOnly = false,
}: PageEditorProps<TwoColumnPage>) {
  const invalidPaths = issuePathsFor(page)

  return (
    <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
      <ContentReadinessSummary page={page} />
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

        {page.items.map((item, itemIndex) => (
          <fieldset key={itemIndex} className="space-y-2 rounded-md border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">
              Item {itemIndex + 1}
            </legend>
            <div className="space-y-2">
              <Label htmlFor={`item-${itemIndex}-heading`}>Heading</Label>
              <Input
                id={`item-${itemIndex}-heading`}
                value={item.heading}
                aria-invalid={
                  invalidPaths.has(`items[${itemIndex}].heading`) || undefined
                }
                onChange={(event) =>
                  onChange((currentDeck) =>
                    setPageItem(
                      currentDeck,
                      pageIndex,
                      itemIndex,
                      "heading",
                      event.target.value
                    )
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`item-${itemIndex}-body`}>Body</Label>
              <Textarea
                id={`item-${itemIndex}-body`}
                value={item.body}
                aria-invalid={
                  invalidPaths.has(`items[${itemIndex}].body`) || undefined
                }
                onChange={(event) =>
                  onChange((currentDeck) =>
                    setPageItem(
                      currentDeck,
                      pageIndex,
                      itemIndex,
                      "body",
                      event.target.value
                    )
                  )
                }
              />
            </div>
          </fieldset>
        ))}

        <PanelEditorForm
          deck={deck}
          pageIndex={pageIndex}
          panel={page.panel}
          onChange={onChange}
          readOnly={readOnly}
          invalidPaths={invalidPaths}
        />

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
