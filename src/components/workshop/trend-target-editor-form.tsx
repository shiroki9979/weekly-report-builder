import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { EditorialPageEditorChrome } from "@/components/workshop/editorial-page-editor-chrome"
import { MetricFormatFields } from "@/components/workshop/metric-format-fields"
import type { PageEditorProps } from "@/components/workshop/page-editor-props"
import { issuePaths } from "@/lib/export-readiness"
import { observationPath } from "@/lib/metric-input"
import {
  canChangeTrendEndpoint,
  isRedateProposal,
  isStartSettled,
  observationEntryPath,
  trendStartInput,
  type TrendEndpointAction,
} from "@/lib/trend-input"
import {
  TREND_CADENCE_LOCKED,
  type TrendEditorControls,
} from "@/lib/trend-session"
import {
  isTrendCadence,
  isTrendDirection,
  observationDate,
  TREND_CADENCES,
  TREND_DIRECTIONS,
  trendCadenceRule,
  trendDatingError,
  trendDirectionRule,
  trendRangeEnd,
  UNMEASURED_COPY,
} from "@/lib/trend-target"
import { typedPageUpdater } from "@/lib/update-deck-page"
import {
  hasEnteredObservations,
  isTrendTargetPage,
  type UnmeasuredState,
  type TrendObservation,
  type TrendTargetPage,
} from "@/lib/deck"

const updateTrendPage = typedPageUpdater(isTrendTargetPage, "Trend & Target")

// 日期不合法時不顯示預覽即可；錯誤原因已由 readiness 的 start issue 呈現
function proposedRange(page: TrendTargetPage, start: string): string | null {
  const length = page.observations.length
  if (trendDatingError(page.cadence, start, length)) return null
  return `${start} – ${trendRangeEnd(page.cadence, start, length)}`
}

// Missing 與輸入數值互為切換：按鈕文案與切換後的狀態都由目前狀態決定
function observationToggle(entry: TrendObservation): {
  label: string
  next: UnmeasuredState
} {
  return entry.state === "missing"
    ? { label: "Enter value", next: "unfilled" }
    : { label: UNMEASURED_COPY.missing.observation, next: "missing" }
}

const ENDPOINT_BUTTONS: {
  action: TrendEndpointAction
  label: (noun: string) => string
}[] = [
  { action: "prepend", label: (noun) => `Add earlier ${noun}` },
  { action: "append", label: (noun) => `Add later ${noun}` },
  { action: "remove-first", label: (noun) => `Remove earliest ${noun}` },
  { action: "remove-last", label: (noun) => `Remove latest ${noun}` },
]

type Props = PageEditorProps<TrendTargetPage> & {
  trendControls: TrendEditorControls
}

type FieldProps = {
  page: TrendTargetPage
  paths: Set<string>
  trendControls: TrendEditorControls
}

type UpdateTrend = (
  change: (current: TrendTargetPage) => TrendTargetPage
) => void

function TrendMetricLabel({
  page,
  paths,
  update,
}: Pick<FieldProps, "page" | "paths"> & { update: UpdateTrend }) {
  const setLabel = (label: string) =>
    update((current) => ({
      ...current,
      metric: { ...current.metric, label },
    }))
  return (
    <div className="space-y-2">
      <Label htmlFor="trend-metric">Metric label</Label>
      <Input
        id="trend-metric"
        value={page.metric.label}
        aria-invalid={paths.has("metric.label") || undefined}
        onChange={(event) => setLabel(event.target.value)}
      />
    </div>
  )
}

function TrendCadenceControl({
  page,
  trendControls,
  readOnly,
}: Pick<FieldProps, "page" | "trendControls"> & { readOnly?: boolean }) {
  const locked = hasEnteredObservations(page.observations)
  return (
    <div className="space-y-2">
      <Label htmlFor="trend-cadence">Cadence</Label>
      <Select
        value={page.cadence}
        disabled={readOnly || locked}
        onValueChange={(value) => {
          if (isTrendCadence(value)) trendControls.setCadence(page.id, value)
        }}
      >
        <SelectTrigger id="trend-cadence" aria-describedby="trend-cadence-hint">
          <SelectValue>
            {(value: string | null) =>
              isTrendCadence(value) ? trendCadenceRule(value).adjective : value
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {TREND_CADENCES.map((cadence) => (
            <SelectItem key={cadence} value={cadence}>
              {trendCadenceRule(cadence).adjective}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {locked ? (
        <p id="trend-cadence-hint" className="text-xs text-muted-foreground">
          {TREND_CADENCE_LOCKED}.
        </p>
      ) : null}
    </div>
  )
}

function TrendDateRangeControls({
  page,
  paths,
  trendControls,
  startText,
}: FieldProps & { startText: string }) {
  const rule = trendCadenceRule(page.cadence)
  const dateProposal = isRedateProposal(page, startText)
    ? proposedRange(page, startText)
    : null
  return (
    <div className="space-y-2">
      <Label htmlFor="trend-start">{rule.startLabel}</Label>
      <Input
        id="trend-start"
        placeholder="YYYY-MM-DD"
        value={startText}
        aria-invalid={paths.has("start") || undefined}
        onChange={(event) =>
          trendControls.write(trendStartInput(page.id), event.target.value)
        }
      />
      <p className="text-xs text-muted-foreground">
        {page.cadence === "week"
          ? "Set a Monday before entering values."
          : "Set the first day of a month before entering values."}{" "}
        Changing the date of entered {rule.noun}s requires confirmation.
      </p>
      {dateProposal && page.start && (
        <div
          className="space-y-2 rounded-md border p-3"
          role="group"
          aria-label="Review date change"
        >
          <p>
            Current observed {rule.noun}s: {proposedRange(page, page.start)}
          </p>
          <p>
            Proposed observed {rule.noun}s: {dateProposal}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => trendControls.confirmRedate(page.id)}
            >
              Confirm new dates
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => trendControls.cancelRedate(page.id)}
            >
              Cancel date change
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function TrendObservationControls({
  page,
  paths,
  trendControls,
  startText,
  readOnly,
}: FieldProps & { startText: string; readOnly?: boolean }) {
  const rangeReady = isStartSettled(page, startText)
  const rule = trendCadenceRule(page.cadence)
  const { start } = page
  return (
    <fieldset className="space-y-2 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">
        {rule.adjective} observations
      </legend>
      <div className="flex flex-wrap gap-2">
        {ENDPOINT_BUTTONS.map(({ action, label }) => (
          <Button
            key={action}
            type="button"
            variant="outline"
            disabled={
              !rangeReady || !canChangeTrendEndpoint(page.observations, action)
            }
            onClick={() => trendControls.changeEndpoint(page.id, action)}
          >
            {label(rule.noun)}
          </Button>
        ))}
      </div>
      {page.observations.map((entry, index) => {
        const path = observationPath(index)
        const position = `${rule.noun[0].toUpperCase()}${rule.noun.slice(1)} ${index + 1}`
        const label = start
          ? `${position} · ${observationDate(page.cadence, start, index)}`
          : position
        const toggle = observationToggle(entry)
        return (
          <div key={index} className="space-y-1">
            <Label htmlFor={`trend-value-${index}`}>{label}</Label>
            {entry.state === "missing" ? (
              <p>{UNMEASURED_COPY.missing.observation}</p>
            ) : (
              <Input
                id={`trend-value-${index}`}
                inputMode="decimal"
                disabled={readOnly || !start}
                value={trendControls.read({ pageId: page.id, path })}
                aria-invalid={
                  paths.has(path) ||
                  paths.has(observationEntryPath(index)) ||
                  undefined
                }
                onChange={(event) =>
                  trendControls.write(
                    { pageId: page.id, path },
                    event.target.value
                  )
                }
              />
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={readOnly || !start}
              aria-label={`${toggle.label} for ${label}`}
              onClick={() =>
                trendControls.setObservationState(
                  { pageId: page.id, index },
                  toggle.next
                )
              }
            >
              {toggle.label}
            </Button>
          </div>
        )
      })}
    </fieldset>
  )
}

function TrendTargetAndFormatControls({
  page,
  paths,
  trendControls,
  update,
}: FieldProps & { update: UpdateTrend }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="trend-target">Fixed target</Label>
        <Input
          id="trend-target"
          inputMode="decimal"
          value={trendControls.read({ pageId: page.id, path: "target" })}
          aria-invalid={paths.has("target") || undefined}
          onChange={(event) =>
            trendControls.write(
              { pageId: page.id, path: "target" },
              event.target.value
            )
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="trend-direction">Target direction</Label>
        <Select
          value={page.direction}
          onValueChange={(value) => {
            if (isTrendDirection(value))
              update((current) => ({ ...current, direction: value }))
          }}
        >
          <SelectTrigger id="trend-direction">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TREND_DIRECTIONS.map((direction) => (
              <SelectItem key={direction} value={direction}>
                {trendDirectionRule(direction).choiceLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <MetricFormatFields
        idPrefix="trend"
        format={page.metric}
        onChange={(patch) =>
          update((current) => ({
            ...current,
            metric: { ...current.metric, ...patch },
          }))
        }
      />
    </div>
  )
}

function TrendNarrativeControls({
  page,
  paths,
  update,
}: Pick<FieldProps, "page" | "paths"> & { update: UpdateTrend }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="trend-interpretation">Interpretation</Label>
        <Textarea
          id="trend-interpretation"
          value={page.interpretation}
          aria-invalid={paths.has("interpretation") || undefined}
          onChange={(event) =>
            update((current) => ({
              ...current,
              interpretation: event.target.value,
            }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="trend-context">Measurement Context</Label>
        <Textarea
          id="trend-context"
          value={page.measurementContext}
          aria-invalid={paths.has("measurementContext") || undefined}
          onChange={(event) =>
            update((current) => ({
              ...current,
              measurementContext: event.target.value,
            }))
          }
        />
      </div>
    </>
  )
}

export function TrendTargetEditorForm({
  deck,
  page,
  pageIndex,
  onChange,
  readOnly,
  trendControls,
}: Props) {
  const issues = trendControls.readiness(page.id)
  const paths = issuePaths(issues)
  const update: UpdateTrend = (change) =>
    onChange((current) => updateTrendPage(current, pageIndex, change))
  const startText = trendControls.read(trendStartInput(page.id))

  return (
    <EditorialPageEditorChrome
      deck={deck}
      page={page}
      pageIndex={pageIndex}
      onChange={onChange}
      readOnly={readOnly}
      invalidPaths={paths}
      readinessIssues={issues}
    >
      <TrendMetricLabel page={page} paths={paths} update={update} />
      <TrendCadenceControl
        page={page}
        trendControls={trendControls}
        readOnly={readOnly}
      />
      <TrendDateRangeControls
        page={page}
        paths={paths}
        trendControls={trendControls}
        startText={startText}
      />
      <TrendObservationControls
        page={page}
        paths={paths}
        trendControls={trendControls}
        startText={startText}
        readOnly={readOnly}
      />
      <TrendTargetAndFormatControls
        page={page}
        paths={paths}
        trendControls={trendControls}
        update={update}
      />
      <TrendNarrativeControls page={page} paths={paths} update={update} />
    </EditorialPageEditorChrome>
  )
}
