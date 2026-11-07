import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChartEditorForm } from "@/components/workshop/chart-editor-form"
import { ChecklistEditorForm } from "@/components/workshop/checklist-editor-form"
import { FlowEditorForm } from "@/components/workshop/flow-editor-form"
import type { PanelEditorProps } from "@/components/workshop/page-editor-props"
import {
  canRemoveEntry,
  CARDINALITY,
  type Panel,
  type TablePanel,
} from "@/lib/deck"
import {
  addTableColumn,
  addTableRow,
  removeTableColumn,
  removeTableRow,
  setTablePanelCell,
  setTablePanelColumn,
  setTablePanelTitle,
  setTableReferenceColumn,
} from "@/lib/deck-editor"

type PanelEditorFormProps = PanelEditorProps<Panel> & {
  readOnly?: boolean
  invalidPaths: Set<string>
}

export function PanelEditorForm({
  deck,
  pageIndex,
  panel,
  onChange,
  readOnly = false,
  invalidPaths,
}: PanelEditorFormProps) {
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
      <div className="space-y-2">
        <Label htmlFor="table-reference-column">Reference column</Label>
        <Select
          value={panel.referenceColumn?.toString() ?? "none"}
          disabled={readOnly}
          onValueChange={(value) => {
            if (value === null) return
            onChange((deck) =>
              setTableReferenceColumn(
                deck,
                pageIndex,
                value === "none" ? undefined : Number(value)
              )
            )
          }}
        >
          <SelectTrigger id="table-reference-column">
            <SelectValue>
              {panel.referenceColumn === undefined
                ? "None"
                : panel.columns[panel.referenceColumn] ||
                  `Column ${panel.referenceColumn + 1}`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {panel.columns.map((column, index) => (
              <SelectItem key={index} value={index.toString()}>
                {column || `Column ${index + 1}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
