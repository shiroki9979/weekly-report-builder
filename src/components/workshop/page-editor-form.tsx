import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChartEditorForm } from "@/components/workshop/chart-editor-form"
import { ChecklistEditorForm } from "@/components/workshop/checklist-editor-form"
import { FlowEditorForm } from "@/components/workshop/flow-editor-form"
import {
  setPageHidden,
  setPageHtmlFile,
  setPageItem,
  setPageNotes,
  setPageTitle,
  setTablePanelCell,
  setTablePanelColumn,
  setTablePanelTitle,
} from "@/lib/week-editor"
import {
  isHtmlWeekPage,
  isTwoColumnWeekPage,
  type WeekDocument,
} from "@/lib/week-document"

type PageEditorFormProps = {
  week: WeekDocument
  pageIndex: number
  onChange: (week: WeekDocument) => void
  readOnly?: boolean
}

export function PageEditorForm({
  week,
  pageIndex,
  onChange,
  readOnly = false,
}: PageEditorFormProps) {
  const page = week.pages[pageIndex]

  if (!page) {
    return null
  }

  if (isHtmlWeekPage(page)) {
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
                onChange(setPageTitle(week, pageIndex, event.target.value))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="page-html-file">HTML file</Label>
            <Input
              id="page-html-file"
              value={page.htmlFile}
              onChange={(event) =>
                onChange(setPageHtmlFile(week, pageIndex, event.target.value))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="speaker-notes">Speaker notes</Label>
            <Textarea
              id="speaker-notes"
              value={page.notes ?? ""}
              onChange={(event) =>
                onChange(setPageNotes(week, pageIndex, event.target.value))
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="page-hidden"
              checked={page.hidden ?? false}
              onCheckedChange={(checked) =>
                onChange(setPageHidden(week, pageIndex, checked === true))
              }
            />
            <Label htmlFor="page-hidden">Hide page from export</Label>
          </div>
        </fieldset>
      </form>
    )
  }

  if (!isTwoColumnWeekPage(page)) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        This layout is not editable yet.
      </p>
    )
  }

  const panel = page.panel

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
              onChange(setPageTitle(week, pageIndex, event.target.value))
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
                onChange={(event) =>
                  onChange(
                    setPageItem(
                      week,
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
                onChange={(event) =>
                  onChange(
                    setPageItem(
                      week,
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

        {panel.kind === "table" ? (
          <fieldset className="space-y-3 rounded-md border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">
              Table panel
            </legend>
            <div className="space-y-2">
              <Label htmlFor="panel-title">Panel title</Label>
              <Input
                id="panel-title"
                value={panel.title}
                onChange={(event) =>
                  onChange(
                    setTablePanelTitle(week, pageIndex, event.target.value)
                  )
                }
              />
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
                    onChange={(event) =>
                      onChange(
                        setTablePanelColumn(
                          week,
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
                      onChange={(event) =>
                        onChange(
                          setTablePanelCell(
                            week,
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
        ) : null}

        {panel.kind === "chart" ? (
          <ChartEditorForm
            week={week}
            pageIndex={pageIndex}
            panel={panel}
            onChange={onChange}
          />
        ) : null}

        {panel.kind === "flow" ? (
          <FlowEditorForm
            week={week}
            pageIndex={pageIndex}
            panel={panel}
            onChange={onChange}
          />
        ) : null}

        {panel.kind === "checklist" ? (
          <ChecklistEditorForm
            week={week}
            pageIndex={pageIndex}
            panel={panel}
            onChange={onChange}
          />
        ) : null}

        {panel.kind !== "table" &&
        panel.kind !== "chart" &&
        panel.kind !== "flow" &&
        panel.kind !== "checklist" ? (
          <p className="text-sm text-muted-foreground">
            This panel kind is not editable yet.
          </p>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="speaker-notes">Speaker notes</Label>
          <Textarea
            id="speaker-notes"
            value={page.notes ?? ""}
            onChange={(event) =>
              onChange(setPageNotes(week, pageIndex, event.target.value))
            }
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="page-hidden"
            checked={page.hidden ?? false}
            onCheckedChange={(checked) =>
              onChange(setPageHidden(week, pageIndex, checked === true))
            }
          />
          <Label htmlFor="page-hidden">Hide page from export</Label>
        </div>
      </fieldset>
    </form>
  )
}
