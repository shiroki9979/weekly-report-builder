import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChartEditorForm } from "@/components/workshop/chart-editor-form"
import { ChecklistEditorForm } from "@/components/workshop/checklist-editor-form"
import { ContentReadinessSummary } from "@/components/workshop/content-readiness-summary"
import { FlowEditorForm } from "@/components/workshop/flow-editor-form"
import { EvidenceDecisionEditorForm } from "@/components/workshop/evidence-decision-editor-form"
import { NextActionsEditorForm } from "@/components/workshop/next-actions-editor-form"
import type {
  PageEditorProps,
  PanelEditorProps,
} from "@/components/workshop/page-editor-props"
import type { LayoutEditorControls } from "@/hooks/use-editing-session"
import { PageNumberSelect } from "@/components/workshop/page-number-select"
import { OverviewEditorForm } from "@/components/workshop/overview-editor-form"
import { TrendTargetEditorForm } from "@/components/workshop/trend-target-editor-form"
import { issuePathsFor } from "@/lib/export-readiness"
import {
  addTableColumn,
  addTableRow,
  removeTableColumn,
  removeTableRow,
  setPageHidden,
  setPageHtmlFile,
  setPageItem,
  setPageNotes,
  setPageTitle,
  setTablePanelCell,
  setTablePanelColumn,
  setTablePanelTitle,
} from "@/lib/deck-editor"
import {
  canRemoveEntry,
  CARDINALITY,
  matchPage,
  type HtmlPage,
  type TablePanel,
  type TwoColumnPage,
} from "@/lib/deck"

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

        <TwoColumnPanelEditor
          deck={deck}
          pageIndex={pageIndex}
          page={page}
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

type TwoColumnPanelEditorProps = PageEditorProps<TwoColumnPage> & {
  invalidPaths: Set<string>
}

function TwoColumnPanelEditor({
  deck,
  pageIndex,
  page,
  onChange,
  readOnly = false,
  invalidPaths,
}: TwoColumnPanelEditorProps) {
  const panel = page.panel
  switch (panel.kind) {
    case "table":
      return (
        <TablePanelEditorForm
          deck={deck}
          pageIndex={pageIndex}
          panel={panel}
          onChange={onChange}
          readOnly={readOnly}
          invalidPaths={invalidPaths}
        />
      )
    case "chart":
      return (
        <ChartEditorForm
          deck={deck}
          pageIndex={pageIndex}
          panel={panel}
          onChange={onChange}
        />
      )
    case "flow":
      return (
        <FlowEditorForm
          deck={deck}
          pageIndex={pageIndex}
          panel={panel}
          onChange={onChange}
        />
      )
    case "checklist":
      return (
        <ChecklistEditorForm
          deck={deck}
          pageIndex={pageIndex}
          panel={panel}
          onChange={onChange}
        />
      )
    case "fields":
      return (
        <p className="text-sm text-muted-foreground">
          This panel kind is not editable yet.
        </p>
      )
  }
}

type TablePanelEditorFormProps = PanelEditorProps<TablePanel> & {
  // 增刪按鈕另外依 readOnly 與數量規則判斷可用性，所以 table 需要明確的 readOnly
  readOnly: boolean
  invalidPaths: Set<string>
}

function TablePanelEditorForm({
  pageIndex,
  panel,
  onChange,
  readOnly,
  invalidPaths,
}: TablePanelEditorFormProps) {
  return (
    <fieldset className="space-y-3 rounded-md border p-3">
      <legend className="px-1 text-xs font-medium text-muted-foreground">
        Table panel
      </legend>
      <div className="space-y-2">
        <Label htmlFor="panel-title">Panel title</Label>
        <Input
          id="panel-title"
          value={panel.title}
          aria-invalid={invalidPaths.has("panel.title") || undefined}
          onChange={(event) =>
            onChange((currentDeck) =>
              setTablePanelTitle(currentDeck, pageIndex, event.target.value)
            )
          }
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={readOnly}
          onClick={() =>
            onChange((currentDeck) => addTableRow(currentDeck, pageIndex))
          }
        >
          Add row
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={
            readOnly || !canRemoveEntry(panel.rows, CARDINALITY.tableRows)
          }
          onClick={() =>
            onChange((currentDeck) =>
              removeTableRow(currentDeck, pageIndex, panel.rows.length - 1)
            )
          }
        >
          Remove row
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={readOnly}
          onClick={() =>
            onChange((currentDeck) => addTableColumn(currentDeck, pageIndex))
          }
        >
          Add column
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={
            readOnly || !canRemoveEntry(panel.columns, CARDINALITY.tableColumns)
          }
          onClick={() =>
            onChange((currentDeck) =>
              removeTableColumn(
                currentDeck,
                pageIndex,
                panel.columns.length - 1
              )
            )
          }
        >
          Remove column
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {panel.columns.map((column, columnIndex) => (
          <div key={columnIndex} className="space-y-2">
            <Label htmlFor={`column-${columnIndex}`}>
              Column {columnIndex + 1}
            </Label>
            <Input
              id={`column-${columnIndex}`}
              value={column}
              aria-invalid={
                invalidPaths.has(`panel.columns[${columnIndex}]`) || undefined
              }
              onChange={(event) =>
                onChange((currentDeck) =>
                  setTablePanelColumn(
                    currentDeck,
                    pageIndex,
                    columnIndex,
                    event.target.value
                  )
                )
              }
            />
          </div>
        ))}
      </div>
      {panel.rows.map((row, rowIndex) => (
        <div key={rowIndex} className="grid gap-2 sm:grid-cols-3">
          {row.cells.map((cell, cellIndex) => (
            <div key={cellIndex} className="space-y-2">
              <Label htmlFor={`cell-${rowIndex}-${cellIndex}`}>
                Row {rowIndex + 1}, col {cellIndex + 1}
              </Label>
              <Input
                id={`cell-${rowIndex}-${cellIndex}`}
                value={cell}
                aria-invalid={
                  invalidPaths.has(
                    `panel.rows[${rowIndex}].cells[${cellIndex}]`
                  ) || undefined
                }
                onChange={(event) =>
                  onChange((currentDeck) =>
                    setTablePanelCell(
                      currentDeck,
                      pageIndex,
                      rowIndex,
                      cellIndex,
                      event.target.value
                    )
                  )
                }
              />
            </div>
          ))}
        </div>
      ))}
    </fieldset>
  )
}
