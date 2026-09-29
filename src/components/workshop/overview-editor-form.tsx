import type { ReactNode } from "react"

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
import { issuePathsFor } from "@/lib/export-readiness"
import {
  canAddEntry,
  canRemoveEntry,
  CARDINALITY,
  type StatusTone,
  type OverviewPage,
} from "@/lib/deck"
import {
  addSupportingOutcome,
  makeLead,
  moveSupportingOutcome,
  removeSupportingOutcome,
  setOverviewLeadField,
  setOverviewLeadStatus,
  setOverviewSupportingField,
  setOverviewSupportingStatus,
} from "@/lib/overview-editor"

const TONE_OPTIONS: { value: StatusTone; label: string }[] = [
  { value: "positive", label: "Positive" },
  { value: "caution", label: "Caution" },
  { value: "neutral", label: "Neutral" },
]

export function OverviewEditorForm({
  deck,
  pageIndex,
  page,
  onChange,
  readOnly = false,
}: PageEditorProps<OverviewPage>) {
  const invalidPaths = issuePathsFor(page)
  const canAddSupporting = canAddEntry(
    page.supporting,
    CARDINALITY.supportingOutcomes
  )

  return (
    <EditorialPageEditorChrome
      deck={deck}
      pageIndex={pageIndex}
      page={page}
      onChange={onChange}
      readOnly={readOnly}
      invalidPaths={invalidPaths}
    >
      <OutcomeFields
        idPrefix="lead"
        legend="Lead outcome"
        pathPrefix="lead"
        outcome={page.lead}
        invalidPaths={invalidPaths}
        onTextChange={(field, value) =>
          onChange((currentDeck) =>
            setOverviewLeadField(currentDeck, pageIndex, field, value)
          )
        }
        onStatusChange={(field, value) =>
          onChange((currentDeck) =>
            setOverviewLeadStatus(currentDeck, pageIndex, field, value)
          )
        }
      />

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Supporting outcomes</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canAddSupporting}
          onClick={() =>
            onChange((currentDeck) =>
              addSupportingOutcome(currentDeck, pageIndex)
            )
          }
        >
          Add supporting outcome
        </Button>
      </div>

      {page.supporting.map((outcome, supportingIndex) => (
        <OutcomeFields
          key={supportingIndex}
          idPrefix={`supporting-${supportingIndex}`}
          legend={`Supporting outcome ${supportingIndex + 1}`}
          pathPrefix={`supporting[${supportingIndex}]`}
          outcome={outcome}
          invalidPaths={invalidPaths}
          onTextChange={(field, value) =>
            onChange((currentDeck) =>
              setOverviewSupportingField(
                currentDeck,
                pageIndex,
                supportingIndex,
                field,
                value
              )
            )
          }
          onStatusChange={(field, value) =>
            onChange((currentDeck) =>
              setOverviewSupportingStatus(
                currentDeck,
                pageIndex,
                supportingIndex,
                field,
                value
              )
            )
          }
          toolbar={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onChange((currentDeck) =>
                    makeLead(currentDeck, pageIndex, supportingIndex)
                  )
                }
              >
                Make lead
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={supportingIndex === 0}
                onClick={() =>
                  onChange((currentDeck) =>
                    moveSupportingOutcome(
                      currentDeck,
                      pageIndex,
                      supportingIndex,
                      supportingIndex - 1
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
                disabled={supportingIndex === page.supporting.length - 1}
                onClick={() =>
                  onChange((currentDeck) =>
                    moveSupportingOutcome(
                      currentDeck,
                      pageIndex,
                      supportingIndex,
                      supportingIndex + 1
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
                  !canRemoveEntry(
                    page.supporting,
                    CARDINALITY.supportingOutcomes
                  )
                }
                onClick={() =>
                  onChange((currentDeck) =>
                    removeSupportingOutcome(
                      currentDeck,
                      pageIndex,
                      supportingIndex
                    )
                  )
                }
              >
                Remove
              </Button>
            </div>
          }
        />
      ))}
    </EditorialPageEditorChrome>
  )
}

type OutcomeTextField = "workstream" | "figure" | "result" | "impact"

type OutcomeFieldsProps = {
  idPrefix: string
  legend: string
  pathPrefix: string
  outcome: OverviewPage["lead"]
  invalidPaths: Set<string>
  onTextChange: (field: OutcomeTextField, value: string) => void
  onStatusChange: (field: "label" | "tone", value: string) => void
  toolbar?: ReactNode
}

function OutcomeFields({
  idPrefix,
  legend,
  pathPrefix,
  outcome,
  invalidPaths,
  onTextChange,
  onStatusChange,
  toolbar,
}: OutcomeFieldsProps) {
  return (
    <fieldset className="space-y-3 rounded-md border p-3">
      <legend className="px-1 text-xs font-medium text-muted-foreground">
        {legend}
      </legend>
      {toolbar}
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-workstream`}>Workstream</Label>
        <Input
          id={`${idPrefix}-workstream`}
          value={outcome.workstream}
          aria-invalid={
            invalidPaths.has(`${pathPrefix}.workstream`) || undefined
          }
          onChange={(event) => onTextChange("workstream", event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-figure`}>Figure</Label>
        <Input
          id={`${idPrefix}-figure`}
          value={outcome.figure}
          aria-invalid={invalidPaths.has(`${pathPrefix}.figure`) || undefined}
          onChange={(event) => onTextChange("figure", event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-result`}>Result</Label>
        <Input
          id={`${idPrefix}-result`}
          value={outcome.result}
          aria-invalid={invalidPaths.has(`${pathPrefix}.result`) || undefined}
          onChange={(event) => onTextChange("result", event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-impact`}>Impact</Label>
        <Input
          id={`${idPrefix}-impact`}
          value={outcome.impact}
          aria-invalid={invalidPaths.has(`${pathPrefix}.impact`) || undefined}
          onChange={(event) => onTextChange("impact", event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-status-label`}>Status label</Label>
        <Input
          id={`${idPrefix}-status-label`}
          value={outcome.status.label}
          aria-invalid={
            invalidPaths.has(`${pathPrefix}.status.label`) || undefined
          }
          onChange={(event) => onStatusChange("label", event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-tone`}>Tone</Label>
        <Select
          value={outcome.status.tone}
          onValueChange={(value) => {
            if (
              value === "positive" ||
              value === "caution" ||
              value === "neutral"
            ) {
              onStatusChange("tone", value)
            }
          }}
        >
          <SelectTrigger id={`${idPrefix}-tone`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TONE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </fieldset>
  )
}
