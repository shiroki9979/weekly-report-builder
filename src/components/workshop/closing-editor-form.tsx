import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EditorialPageEditorChrome } from "@/components/workshop/editorial-page-editor-chrome"
import type { PageEditorProps } from "@/components/workshop/page-editor-props"
import { canAddEntry, CARDINALITY, type ClosingPage } from "@/lib/deck"
import { issuePathsFor } from "@/lib/export-readiness"
import {
  addTakeaway,
  moveTakeaway,
  removeTakeaway,
  setClosingFields,
  setTakeaway,
} from "@/lib/closing-editor"

export function ClosingEditorForm(props: PageEditorProps<ClosingPage>) {
  const { page, pageIndex, onChange } = props
  const invalidPaths = issuePathsFor(page)
  return (
    <EditorialPageEditorChrome {...props} invalidPaths={invalidPaths}>
      <div className="space-y-2">
        <Label htmlFor="closing-eyebrow">Eyebrow</Label>
        <Input
          id="closing-eyebrow"
          value={page.eyebrow}
          placeholder="Closing"
          onChange={(event) =>
            onChange((deck) =>
              setClosingFields(deck, pageIndex, { eyebrow: event.target.value })
            )
          }
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Takeaways</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canAddEntry(page.takeaways, CARDINALITY.takeaways)}
          onClick={() => onChange((deck) => addTakeaway(deck, pageIndex))}
        >
          Add takeaway
        </Button>
      </div>
      {page.takeaways.map((_, index) => (
        <TakeawayEditor
          key={index}
          {...props}
          index={index}
          invalidPaths={invalidPaths}
        />
      ))}
      <div className="space-y-2">
        <Label htmlFor="closing-line">Closing line</Label>
        <Input
          id="closing-line"
          value={page.closingLine}
          onChange={(event) =>
            onChange((deck) =>
              setClosingFields(deck, pageIndex, {
                closingLine: event.target.value,
              })
            )
          }
        />
      </div>
    </EditorialPageEditorChrome>
  )
}

function TakeawayEditor({
  page,
  pageIndex,
  onChange,
  index,
  invalidPaths,
}: PageEditorProps<ClosingPage> & {
  index: number
  invalidPaths: Set<string>
}) {
  const takeaway = page.takeaways[index]
  return (
    <fieldset className="space-y-3 rounded-md border p-3">
      <legend className="px-1 text-xs font-medium text-muted-foreground">
        Takeaway {index + 1}
      </legend>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={index === 0}
          onClick={() =>
            onChange((deck) =>
              moveTakeaway(deck, pageIndex, { from: index, to: index - 1 })
            )
          }
        >
          Move up
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={index === page.takeaways.length - 1}
          onClick={() =>
            onChange((deck) =>
              moveTakeaway(deck, pageIndex, { from: index, to: index + 1 })
            )
          }
        >
          Move down
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange((deck) => removeTakeaway(deck, pageIndex, index))
          }
        >
          Remove
        </Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`takeaway-${index}-text`}>Takeaway text</Label>
        <Input
          id={`takeaway-${index}-text`}
          value={takeaway.text}
          aria-invalid={
            invalidPaths.has(`takeaways[${index}].text`) || undefined
          }
          onChange={(event) =>
            onChange((deck) =>
              setTakeaway(deck, pageIndex, { index, text: event.target.value })
            )
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`takeaway-${index}-ref`}>Reference</Label>
        <Input
          id={`takeaway-${index}-ref`}
          value={takeaway.ref ?? ""}
          onChange={(event) =>
            onChange((deck) =>
              setTakeaway(deck, pageIndex, { index, ref: event.target.value })
            )
          }
        />
      </div>
    </fieldset>
  )
}
