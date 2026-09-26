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
import { useMetricDraft } from "@/components/workshop/metric-draft-context"
import {
  addDecisionInterpretation,
  addDecisionMetric,
  moveDecisionInterpretation,
  moveDecisionMetric,
  removeDecisionInterpretation,
  removeDecisionMetric,
  setDecisionInterpretation,
  setDecisionMetricFormat,
  setDecisionMetricLabel,
  setDecisionMetricUnit,
  setDecisionMetricValue,
  setDecisionVerdict,
} from "@/lib/evidence-decision-editor"
import {
  metricDraftPath,
  readMetricDraft,
  remapMetricBufferAfterMove,
  remapMetricBufferAfterRemove,
  type MetricDraftPath,
} from "@/lib/metric-draft-buffer"
import { issuePathsFor } from "@/lib/export-readiness"
import { parseMetricInput } from "@/lib/metric-format"
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
  readOnly = false,
}: PageEditorProps<EvidenceDecisionPage>) {
  const { buffer, replaceBuffer } = useMetricDraft()
  const invalidPaths = issuePathsFor(page, buffer)

  function applyMetricMove(fromIndex: number, toIndex: number) {
    replaceBuffer(
      remapMetricBufferAfterMove(buffer, page.id, fromIndex, toIndex)
    )
    onChange(moveDecisionMetric(week, pageIndex, fromIndex, toIndex))
  }

  function applyMetricRemove(metricIndex: number) {
    replaceBuffer(remapMetricBufferAfterRemove(buffer, page.id, metricIndex))
    onChange(removeDecisionMetric(week, pageIndex, metricIndex))
  }

  return (
    <EditorialPageEditorChrome
      week={week}
      pageIndex={pageIndex}
      page={page}
      onChange={onChange}
      readOnly={readOnly}
      invalidPaths={invalidPaths}
      metricBuffer={buffer}
    >
      <div className="space-y-2">
        <Label htmlFor="decision-verdict">Verdict</Label>
        <Input
          id="decision-verdict"
          value={page.verdict}
          aria-invalid={invalidPaths.has("verdict") || undefined}
          onChange={(event) =>
            onChange(setDecisionVerdict(week, pageIndex, event.target.value))
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
          onClick={() => onChange(addDecisionMetric(week, pageIndex))}
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
              onClick={() => applyMetricMove(metricIndex, metricIndex - 1)}
            >
              Move up
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={metricIndex === page.metrics.length - 1}
              onClick={() => applyMetricMove(metricIndex, metricIndex + 1)}
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
              onClick={() => applyMetricRemove(metricIndex)}
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
                onChange(
                  setDecisionMetricLabel(
                    week,
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
            pageId={page.id}
            path={metricDraftPath(metricIndex, "baselineValue")}
            typedValue={metric.baselineValue}
            invalid={invalidPaths.has(`metrics[${metricIndex}].baselineValue`)}
            onTypedValue={(value) =>
              onChange(
                setDecisionMetricValue(
                  week,
                  pageIndex,
                  metricIndex,
                  "baselineValue",
                  value
                )
              )
            }
          />
          <MetricNumberField
            id={`metric-${metricIndex}-candidate`}
            label="Candidate"
            pageId={page.id}
            path={metricDraftPath(metricIndex, "candidateValue")}
            typedValue={metric.candidateValue}
            invalid={invalidPaths.has(`metrics[${metricIndex}].candidateValue`)}
            onTypedValue={(value) =>
              onChange(
                setDecisionMetricValue(
                  week,
                  pageIndex,
                  metricIndex,
                  "candidateValue",
                  value
                )
              )
            }
          />
          <div className="space-y-2">
            <Label htmlFor={`metric-${metricIndex}-unit`}>Unit</Label>
            <Input
              id={`metric-${metricIndex}-unit`}
              value={metric.unit}
              onChange={(event) =>
                onChange(
                  setDecisionMetricUnit(
                    week,
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
                  onChange(
                    setDecisionMetricFormat(week, pageIndex, metricIndex, {
                      unitPosition: value,
                    })
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
                  onChange(
                    setDecisionMetricFormat(week, pageIndex, metricIndex, {
                      unitSpacing: value,
                    })
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
                  onChange(
                    setDecisionMetricFormat(week, pageIndex, metricIndex, {
                      precision: Number(value) as 0 | 1 | 2,
                    })
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
          onClick={() => onChange(addDecisionInterpretation(week, pageIndex))}
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
                onChange(
                  moveDecisionInterpretation(
                    week,
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
                onChange(
                  moveDecisionInterpretation(
                    week,
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
                onChange(
                  removeDecisionInterpretation(
                    week,
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
              onChange(
                setDecisionInterpretation(
                  week,
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
  pageId,
  path,
  typedValue,
  invalid,
  onTypedValue,
}: {
  id: string
  label: string
  pageId: string
  path: MetricDraftPath
  typedValue: number | null
  invalid: boolean
  onTypedValue: (value: number | null) => void
}) {
  const { buffer, setRaw } = useMetricDraft()
  const display =
    readMetricDraft(buffer, pageId, path) ??
    (typedValue === null ? "" : String(typedValue))

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={display}
        aria-invalid={invalid || undefined}
        onChange={(event) => {
          const raw = event.target.value
          setRaw(pageId, path, raw)
          const parsed = parseMetricInput(raw)
          if (parsed.status === "empty") {
            onTypedValue(null)
          }
          if (parsed.status === "valid") {
            onTypedValue(parsed.value)
          }
        }}
      />
    </div>
  )
}
