import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ContentReadinessSummary } from "@/components/workshop/content-readiness-summary"
import { issuePathsFor } from "@/lib/export-readiness"
import {
  addCommitment,
  moveCommitment,
  removeCommitment,
  setCommitmentField,
} from "@/lib/next-actions-editor"
import { setPageHidden, setPageNotes, setPageTitle } from "@/lib/week-editor"
import type { NextActionsPage, WeekDocument } from "@/lib/week-document"

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
              onChange(setPageTitle(week, pageIndex, event.target.value))
            }
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Commitments</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page.commitments.length >= 4}
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
                disabled={page.commitments.length <= 2}
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
