import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { EditorialPageEditorChrome } from "@/components/workshop/editorial-page-editor-chrome"
import type { PageEditorProps } from "@/components/workshop/page-editor-props"
import {
  canAddEntry,
  canRemoveEntry,
  CARDINALITY,
  type SideBySidePage,
} from "@/lib/deck"
import { issuePathsFor } from "@/lib/export-readiness"
import {
  addComparisonPoint,
  moveComparisonPoint,
  removeComparisonPoint,
  setComparisonChosen,
  setComparisonColumn,
  setComparisonPoint,
  setComparisonTradeoff,
} from "@/lib/side-by-side-editor"

type EditorProps = PageEditorProps<SideBySidePage>
type ColumnProps = EditorProps & { column: 0 | 1; invalidPaths: Set<string> }

export function SideBySideEditorForm(props: EditorProps) {
  const invalidPaths = issuePathsFor(props.page)
  return (
    <EditorialPageEditorChrome {...props} invalidPaths={invalidPaths}>
      <ComparisonColumnEditor
        {...props}
        column={0}
        invalidPaths={invalidPaths}
      />
      <ComparisonColumnEditor
        {...props}
        column={1}
        invalidPaths={invalidPaths}
      />
      <TradeoffEditor {...props} invalidPaths={invalidPaths} />
    </EditorialPageEditorChrome>
  )
}

function ComparisonColumnEditor(props: ColumnProps) {
  const { page, pageIndex, onChange, column, invalidPaths } = props
  const current = page.columns[column]
  return (
    <fieldset className="space-y-3 rounded-md border p-3">
      <legend className="px-1 text-xs font-medium text-muted-foreground">
        Column {column + 1}
      </legend>
      <div className="space-y-2">
        <Label htmlFor={`comparison-column-${column}`}>Column label</Label>
        <Input
          id={`comparison-column-${column}`}
          value={current.label}
          aria-invalid={
            invalidPaths.has(`columns[${column}].label`) || undefined
          }
          onChange={(event) =>
            onChange((deck) =>
              setComparisonColumn(deck, pageIndex, {
                column,
                label: event.target.value,
              })
            )
          }
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`comparison-chosen-${column}`}
          checked={page.chosen === column}
          onCheckedChange={(checked) =>
            onChange((deck) =>
              setComparisonChosen(
                deck,
                pageIndex,
                checked === true ? column : undefined
              )
            )
          }
        />
        <Label htmlFor={`comparison-chosen-${column}`}>Chosen</Label>
      </div>
      {current.points.map((_, point) => (
        <ComparisonPointEditor key={point} {...props} point={point} />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canAddEntry(current.points, CARDINALITY.comparisonPoints)}
        onClick={() =>
          onChange((deck) => addComparisonPoint(deck, pageIndex, column))
        }
      >
        Add point
      </Button>
    </fieldset>
  )
}

function ComparisonPointEditor({
  page,
  pageIndex,
  onChange,
  column,
  point,
  invalidPaths,
}: ColumnProps & { point: number }) {
  const points = page.columns[column].points
  const inputId = `comparison-${column}-point-${point}`
  return (
    <fieldset className="space-y-2 rounded-md border p-3">
      <legend className="px-1 text-xs text-muted-foreground">
        Point {point + 1}
      </legend>
      <Label htmlFor={inputId}>Point {point + 1}</Label>
      <Textarea
        id={inputId}
        value={points[point]}
        aria-invalid={
          invalidPaths.has(`columns[${column}].points[${point}]`) || undefined
        }
        onChange={(event) =>
          onChange((deck) =>
            setComparisonPoint(deck, pageIndex, {
              column,
              point,
              text: event.target.value,
            })
          )
        }
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={point === 0}
          onClick={() =>
            onChange((deck) =>
              moveComparisonPoint(deck, pageIndex, {
                column,
                from: point,
                to: point - 1,
              })
            )
          }
        >
          Move up
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={point === points.length - 1}
          onClick={() =>
            onChange((deck) =>
              moveComparisonPoint(deck, pageIndex, {
                column,
                from: point,
                to: point + 1,
              })
            )
          }
        >
          Move down
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canRemoveEntry(points, CARDINALITY.comparisonPoints)}
          onClick={() =>
            onChange((deck) =>
              removeComparisonPoint(deck, pageIndex, { column, point })
            )
          }
        >
          Remove
        </Button>
      </div>
    </fieldset>
  )
}

function TradeoffEditor({
  page,
  pageIndex,
  onChange,
  invalidPaths,
}: EditorProps & { invalidPaths: Set<string> }) {
  const tradeoff = page.tradeoff
  return (
    <fieldset className="space-y-3 rounded-md border p-3">
      <legend className="px-1 text-xs font-medium text-muted-foreground">
        Tradeoff Callout
      </legend>
      <div className="flex items-center gap-2">
        <Checkbox
          id="comparison-tradeoff"
          checked={tradeoff !== undefined}
          onCheckedChange={(checked) =>
            onChange((deck) =>
              setComparisonTradeoff(
                deck,
                pageIndex,
                checked === true ? { why: "" } : undefined
              )
            )
          }
        />
        <Label htmlFor="comparison-tradeoff">Include tradeoff</Label>
      </div>
      {tradeoff ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="comparison-why">Why</Label>
            <Textarea
              id="comparison-why"
              value={tradeoff.why}
              aria-invalid={invalidPaths.has("tradeoff.why") || undefined}
              onChange={(event) =>
                onChange((deck) =>
                  setComparisonTradeoff(deck, pageIndex, {
                    ...tradeoff,
                    why: event.target.value,
                  })
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comparison-cost">Cost</Label>
            <Textarea
              id="comparison-cost"
              value={tradeoff.cost ?? ""}
              onChange={(event) =>
                onChange((deck) =>
                  setComparisonTradeoff(deck, pageIndex, {
                    ...tradeoff,
                    cost: event.target.value,
                  })
                )
              }
            />
          </div>
        </>
      ) : null}
    </fieldset>
  )
}
