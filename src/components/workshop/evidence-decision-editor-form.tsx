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
  addDecisionInterpretation,
  addDecisionMetric,
  moveDecisionInterpretation,
  removeDecisionInterpretation,
  setDecisionInterpretation,
  setDecisionMetricFormat,
  setDecisionMetricLabel,
  setDecisionMetricUnit,
  setDecisionVerdict,
} from "@/lib/evidence-decision-editor"
import {
  canAddEntry,
  canRemoveEntry,
  CARDINALITY,
  type EvidenceDecisionPage,
} from "@/lib/week-document"

export function EvidenceDecisionEditorForm({
  week,
  pageIndex,
  page,
  onChange,
  metricControls,
  readOnly = false,
}: PageEditorProps<EvidenceDecisionPage>) {
  if (!metricControls) {
    throw new Error("Metric editor controls are required")
  }
  const readinessIssues = metricControls.readiness(page.id)
  const invalidPaths = new Set(
    readinessIssues.flatMap((issue) => (issue.path ? [issue.path] : []))
  )

  return (
    <EditorialPageEditorChrome
      week={week}
      pageIndex={pageIndex}
      page={page}
      onChange={onChange}
      readOnly={readOnly}
      invalidPaths={invalidPaths}
      readinessIssues={readinessIssues}
    >
      <div className="space-y-2">
        <Label htmlFor="decision-verdict">Verdict</Label>
        <Input
          id="decision-verdict"
          value={page.verdict}
          aria-invalid={invalidPaths.has("verdict") || undefined}
          onChange={(event) =>
            onChange((currentWeek) =>
              setDecisionVerdict(currentWeek, pageIndex, event.target.value)
            )
          }
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Comparison metrics</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canAddEntry(page.metrics, CARDINALITY.comparisonMetrics)}
          onClick={() =>
            onChange((currentWeek) => addDecisionMetric(currentWeek, pageIndex))
          }
        >
          Add metric
        </Button>
      </div>

      {page.metrics.map((metric, metricIndex) => (
        <fieldset key={metricIndex} className="space-y-3 rounded-md border p-3">
          <legend className="px-1 text-xs font-medium text-muted-foreground">
            Metric {metricIndex + 1}
          </legend>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={metricIndex === 0}
              onClick={() =>
                metricControls.move(page.id, metricIndex, metricIndex - 1)
              }
            >
              Move up
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={metricIndex === page.metrics.length - 1}
              onClick={() =>
                metricControls.move(page.id, metricIndex, metricIndex + 1)
              }
            >
              Move down
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                !canRemoveEntry(page.metrics, CARDINALITY.comparisonMetrics)
              }
              onClick={() => metricControls.remove(page.id, metricIndex)}
            >
              Remove
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`metric-${metricIndex}-label`}>Metric label</Label>
            <Input
              id={`metric-${metricIndex}-label`}
              value={metric.label}
              aria-invalid={
                invalidPaths.has(`metrics[${metricIndex}].label`) || undefined
              }
              onChange={(event) =>
                onChange((currentWeek) =>
                  setDecisionMetricLabel(
                    currentWeek,
                    pageIndex,
                    metricIndex,
                    event.target.value
                  )
                )
              }
            />
          </div>
          <MetricNumberField
            id={`metric-${metricIndex}-baseline`}
            label="Baseline"
            value={metricControls.read({
              pageId: page.id,
              metricIndex,
              field: "baselineValue",
            })}
            invalid={invalidPaths.has(`metrics[${metricIndex}].baselineValue`)}
            onChange={(raw) =>
              metricControls.write(
                { pageId: page.id, metricIndex, field: "baselineValue" },
                raw
              )
            }
          />
          <MetricNumberField
            id={`metric-${metricIndex}-candidate`}
            label="Candidate"
            value={metricControls.read({
              pageId: page.id,
              metricIndex,
              field: "candidateValue",
            })}
            invalid={invalidPaths.has(`metrics[${metricIndex}].candidateValue`)}
            onChange={(raw) =>
              metricControls.write(
                { pageId: page.id, metricIndex, field: "candidateValue" },
                raw
              )
            }
          />
          <div className="space-y-2">
            <Label htmlFor={`metric-${metricIndex}-unit`}>Unit</Label>
            <Input
              id={`metric-${metricIndex}-unit`}
              value={metric.unit}
              onChange={(event) =>
                onChange((currentWeek) =>
                  setDecisionMetricUnit(
                    currentWeek,
                    pageIndex,
                    metricIndex,
                    event.target.value
                  )
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`metric-${metricIndex}-position`}>
              Unit position
            </Label>
            <Select
              value={metric.unitPosition}
              onValueChange={(value) => {
                if (value === "before" || value === "after") {
                  onChange((currentWeek) =>
                    setDecisionMetricFormat(
                      currentWeek,
                      pageIndex,
                      metricIndex,
                      {
                        unitPosition: value,
                      }
                    )
                  )
                }
              }}
            >
              <SelectTrigger id={`metric-${metricIndex}-position`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="after">After</SelectItem>
                <SelectItem value="before">Before</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`metric-${metricIndex}-spacing`}>
              Unit spacing
            </Label>
            <Select
              value={metric.unitSpacing}
              onValueChange={(value) => {
                if (value === "none" || value === "space") {
                  onChange((currentWeek) =>
                    setDecisionMetricFormat(
                      currentWeek,
                      pageIndex,
                      metricIndex,
                      {
                        unitSpacing: value,
                      }
                    )
                  )
                }
              }}
            >
              <SelectTrigger id={`metric-${metricIndex}-spacing`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="space">Space</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`metric-${metricIndex}-precision`}>Precision</Label>
            <Select
              value={String(metric.precision)}
              onValueChange={(value) => {
                if (value === "0" || value === "1" || value === "2") {
                  onChange((currentWeek) =>
                    setDecisionMetricFormat(
                      currentWeek,
                      pageIndex,
                      metricIndex,
                      {
                        precision: Number(value) as 0 | 1 | 2,
                      }
                    )
                  )
                }
              }}
            >
              <SelectTrigger id={`metric-${metricIndex}-precision`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </fieldset>
      ))}

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Interpretations</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={
            !canAddEntry(page.interpretations, CARDINALITY.interpretations)
          }
          onClick={() =>
            onChange((currentWeek) =>
              addDecisionInterpretation(currentWeek, pageIndex)
            )
          }
        >
          Add interpretation
        </Button>
      </div>

      {page.interpretations.map((text, interpretationIndex) => (
        <fieldset
          key={interpretationIndex}
          className="space-y-2 rounded-md border p-3"
        >
          <legend className="px-1 text-xs font-medium text-muted-foreground">
            Interpretation {interpretationIndex + 1}
          </legend>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={interpretationIndex === 0}
              onClick={() =>
                onChange((currentWeek) =>
                  moveDecisionInterpretation(
                    currentWeek,
                    pageIndex,
                    interpretationIndex,
                    interpretationIndex - 1
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
              disabled={interpretationIndex === page.interpretations.length - 1}
              onClick={() =>
                onChange((currentWeek) =>
                  moveDecisionInterpretation(
                    currentWeek,
                    pageIndex,
                    interpretationIndex,
                    interpretationIndex + 1
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
                  page.interpretations,
                  CARDINALITY.interpretations
                )
              }
              onClick={() =>
                onChange((currentWeek) =>
                  removeDecisionInterpretation(
                    currentWeek,
                    pageIndex,
                    interpretationIndex
                  )
                )
              }
            >
              Remove
            </Button>
          </div>
          <Input
            id={`interpretation-${interpretationIndex}`}
            aria-label={`Interpretation ${interpretationIndex + 1}`}
            value={text}
            aria-invalid={
              invalidPaths.has(`interpretations[${interpretationIndex}]`) ||
              undefined
            }
            onChange={(event) =>
              onChange((currentWeek) =>
                setDecisionInterpretation(
                  currentWeek,
                  pageIndex,
                  interpretationIndex,
                  event.target.value
                )
              )
            }
          />
        </fieldset>
      ))}
    </EditorialPageEditorChrome>
  )
}

function MetricNumberField({
  id,
  label,
  value,
  invalid,
  onChange,
}: {
  id: string
  label: string
  value: string
  invalid: boolean
  onChange: (raw: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
