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
import { EditorialPageEditorChrome } from "@/components/workshop/editorial-page-editor-chrome"
import type { PageEditorProps } from "@/components/workshop/page-editor-props"
import {
  addCommitment,
  moveCommitment,
  removeCommitment,
  setCommitmentField,
  setNextActionsVariant,
} from "@/lib/next-actions-editor"
import { issuePathsFor } from "@/lib/export-readiness"
import {
  canAddEntry,
  canRemoveEntry,
  CARDINALITY,
  isNextActionsVariant,
  NEXT_ACTIONS_VARIANTS,
  nextActionsVariant,
  type NextActionsPage,
  type NextActionsVariant,
} from "@/lib/deck"

const VARIANT_LABELS: Record<NextActionsVariant, string> = {
  rows: "Rows",
  columns: "Columns",
}

export function NextActionsEditorForm({
  deck,
  pageIndex,
  page,
  onChange,
  readOnly = false,
}: PageEditorProps<NextActionsPage>) {
  const invalidPaths = issuePathsFor(page)

  return (
    <EditorialPageEditorChrome
      deck={deck}
      pageIndex={pageIndex}
      page={page}
      onChange={onChange}
      readOnly={readOnly}
      invalidPaths={invalidPaths}
    >
      <div className="space-y-2">
        <Label htmlFor="next-actions-variant">Composition</Label>
        <Select
          value={nextActionsVariant(page)}
          disabled={readOnly}
          onValueChange={(value) => {
            if (isNextActionsVariant(value)) {
              onChange((currentDeck) =>
                setNextActionsVariant(currentDeck, pageIndex, value)
              )
            }
          }}
        >
          <SelectTrigger id="next-actions-variant">
            <SelectValue>
              {VARIANT_LABELS[nextActionsVariant(page)]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {NEXT_ACTIONS_VARIANTS.map((variant) => (
              <SelectItem key={variant} value={variant}>
                {VARIANT_LABELS[variant]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Commitments</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canAddEntry(page.commitments, CARDINALITY.commitments)}
          onClick={() =>
            onChange((currentDeck) => addCommitment(currentDeck, pageIndex))
          }
        >
          Add commitment
        </Button>
      </div>

      {page.commitments.map((commitment, commitmentIndex) => (
        <fieldset
          key={commitmentIndex}
          className="space-y-3 rounded-md border p-3"
        >
          <legend className="px-1 text-xs font-medium text-muted-foreground">
            Commitment {commitmentIndex + 1}
          </legend>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={commitmentIndex === 0}
              onClick={() =>
                onChange((currentDeck) =>
                  moveCommitment(
                    currentDeck,
                    pageIndex,
                    commitmentIndex,
                    commitmentIndex - 1
                  )
                )
              }
            >
              Move up
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={commitmentIndex === page.commitments.length - 1}
              onClick={() =>
                onChange((currentDeck) =>
                  moveCommitment(
                    currentDeck,
                    pageIndex,
                    commitmentIndex,
                    commitmentIndex + 1
                  )
                )
              }
            >
              Move down
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                !canRemoveEntry(page.commitments, CARDINALITY.commitments)
              }
              onClick={() =>
                onChange((currentDeck) =>
                  removeCommitment(currentDeck, pageIndex, commitmentIndex)
                )
              }
            >
              Remove
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`commitment-${commitmentIndex}-title`}>
              Commitment title
            </Label>
            <Input
              id={`commitment-${commitmentIndex}-title`}
              value={commitment.title}
              aria-invalid={
                invalidPaths.has(`commitments[${commitmentIndex}].title`) ||
                undefined
              }
              onChange={(event) =>
                onChange((currentDeck) =>
                  setCommitmentField(
                    currentDeck,
                    pageIndex,
                    commitmentIndex,
                    "title",
                    event.target.value
                  )
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`commitment-${commitmentIndex}-outcome`}>
              Outcome
            </Label>
            <Input
              id={`commitment-${commitmentIndex}-outcome`}
              value={commitment.outcome}
              aria-invalid={
                invalidPaths.has(`commitments[${commitmentIndex}].outcome`) ||
                undefined
              }
              onChange={(event) =>
                onChange((currentDeck) =>
                  setCommitmentField(
                    currentDeck,
                    pageIndex,
                    commitmentIndex,
                    "outcome",
                    event.target.value
                  )
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`commitment-${commitmentIndex}-checkpoint`}>
              Checkpoint
            </Label>
            <Input
              id={`commitment-${commitmentIndex}-checkpoint`}
              value={commitment.checkpoint}
              aria-invalid={
                invalidPaths.has(
                  `commitments[${commitmentIndex}].checkpoint`
                ) || undefined
              }
              onChange={(event) =>
                onChange((currentDeck) =>
                  setCommitmentField(
                    currentDeck,
                    pageIndex,
                    commitmentIndex,
                    "checkpoint",
                    event.target.value
                  )
                )
              }
            />
          </div>
        </fieldset>
      ))}
    </EditorialPageEditorChrome>
  )
}
