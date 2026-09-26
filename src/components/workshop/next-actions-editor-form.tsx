import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EditorialPageEditorChrome } from "@/components/workshop/editorial-page-editor-chrome"
import {
  addCommitment,
  moveCommitment,
  removeCommitment,
  setCommitmentField,
} from "@/lib/next-actions-editor"
import { issuePathsFor } from "@/lib/export-readiness"
import {
  canAddEntry,
  canRemoveEntry,
  CARDINALITY,
  type NextActionsPage,
  type WeekDocument,
} from "@/lib/week-document"

type NextActionsEditorFormProps = {
  week: WeekDocument
  pageIndex: number
  page: NextActionsPage
  onChange: (week: WeekDocument) => void
  readOnly?: boolean
}

export function NextActionsEditorForm({
  week,
  pageIndex,
  page,
  onChange,
  readOnly = false,
}: NextActionsEditorFormProps) {
  const invalidPaths = issuePathsFor(page)

  return (
    <EditorialPageEditorChrome
      week={week}
      pageIndex={pageIndex}
      page={page}
      onChange={onChange}
      readOnly={readOnly}
      invalidPaths={invalidPaths}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Commitments</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canAddEntry(page.commitments, CARDINALITY.commitments)}
          onClick={() => onChange(addCommitment(week, pageIndex))}
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
                onChange(
                  moveCommitment(
                    week,
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
                onChange(
                  moveCommitment(
                    week,
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
                onChange(removeCommitment(week, pageIndex, commitmentIndex))
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
                onChange(
                  setCommitmentField(
                    week,
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
                onChange(
                  setCommitmentField(
                    week,
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
                onChange(
                  setCommitmentField(
                    week,
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
