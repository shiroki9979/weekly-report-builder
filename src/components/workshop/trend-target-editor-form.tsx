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
import type { PageEditorProps } from "@/components/workshop/page-editor-props"
import type { TrendEditorControls } from "@/lib/editing-session"
import { issuePaths } from "@/lib/export-readiness"
import { isCalendarMonday, observationMonday } from "@/lib/trend-target"
import { typedPageUpdater } from "@/lib/update-week-page"
import { isTrendTargetPage, type TrendTargetPage } from "@/lib/week-document"

const updateTrendPage = typedPageUpdater(isTrendTargetPage, "Trend & Target")

function proposedRange(start: string, length: number): string | null {
  if (!isCalendarMonday(start)) return null
  try {
    return `${start} – ${observationMonday(start, length - 1)}`
  } catch {
    return null
  }
}

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
  const format = (label: string) =>
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
        onChange={(event) => format(event.target.value)}
      />
    </div>
  )
}

function TrendDateRangeControls({ page, paths, trendControls }: FieldProps) {
  const pendingStart = trendControls.read({
    pageId: page.id,
    path: "startMonday",
  })
  const entered = page.observations.some((entry) => entry.state !== "unfilled")
  const dateProposal =
    entered && page.startMonday && pendingStart !== page.startMonday
      ? proposedRange(pendingStart, page.observations.length)
      : null
  return (
    <div className="space-y-2">
      <Label htmlFor="trend-start">Starting Monday</Label>
      <Input
        id="trend-start"
        placeholder="YYYY-MM-DD"
        value={pendingStart}
        aria-invalid={paths.has("startMonday") || undefined}
        onChange={(event) =>
          trendControls.write(
            { pageId: page.id, path: "startMonday" },
            event.target.value
          )
        }
      />
      <p className="text-xs text-muted-foreground">
        Set a Monday before entering values. Changing the date of entered weeks
        requires confirmation.
      </p>
      {dateProposal && page.startMonday && (
        <div
          className="space-y-2 rounded-md border p-3"
          role="group"
          aria-label="Review date change"
        >
          <p>
            Current observed weeks:{" "}
            {proposedRange(page.startMonday, page.observations.length)}
          </p>
          <p>Proposed observed weeks: {dateProposal}</p>
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
  readOnly,
}: FieldProps & { readOnly?: boolean }) {
  const pendingStart = trendControls.read({
    pageId: page.id,
    path: "startMonday",
  })
  const rangeReady = !!page.startMonday && pendingStart === page.startMonday
  return (
    <fieldset className="space-y-2 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">Weekly observations</legend>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!rangeReady || page.observations.length >= 12}
          onClick={() => trendControls.endpoint(page.id, "prepend")}
        >
          Add earlier week
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!rangeReady || page.observations.length >= 12}
          onClick={() => trendControls.endpoint(page.id, "append")}
        >
          Add later week
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!rangeReady || page.observations.length <= 2}
          onClick={() => trendControls.endpoint(page.id, "remove-first")}
        >
          Remove earliest week
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!rangeReady || page.observations.length <= 2}
          onClick={() => trendControls.endpoint(page.id, "remove-last")}
        >
          Remove latest week
        </Button>
      </div>
      {page.observations.map((entry, index) => {
        const path = `observations[${index}].value` as const
        const label = page.startMonday
          ? `Week ${index + 1} · ${observationMonday(page.startMonday, index)}`
          : `Week ${index + 1}`
        return (
          <div key={index} className="space-y-1">
            <Label htmlFor={`trend-value-${index}`}>{label}</Label>
            {entry.state === "missing" ? (
              <p>No observation</p>
            ) : (
              <Input
                id={`trend-value-${index}`}
                inputMode="decimal"
                value={trendControls.read({ pageId: page.id, path })}
                aria-invalid={
                  paths.has(path) ||
                  paths.has(`observations[${index}]`) ||
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
              disabled={readOnly || !page.startMonday}
              aria-label={`${entry.state === "missing" ? "Enter value" : "No observation"} for ${label}`}
              onClick={() =>
                trendControls.setObservationState(
                  { pageId: page.id, index },
                  entry.state === "missing" ? "unfilled" : "missing"
                )
              }
            >
              {entry.state === "missing" ? "Enter value" : "No observation"}
            </Button>
          </div>
        )
      })}
    </fieldset>
  )
}

function TrendMetricFormatControls({
  page,
  paths,
  trendControls,
  update,
}: FieldProps & { update: UpdateTrend }) {
  const format = (
    field: keyof TrendTargetPage["metric"],
    value: string | number
  ) =>
    update((current) => ({
      ...current,
      metric: { ...current.metric, [field]: value },
    }))
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
            if (value === "at-most" || value === "at-least")
              update((current) => ({ ...current, direction: value }))
          }}
        >
          <SelectTrigger id="trend-direction">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="at-most">At most (≤)</SelectItem>
            <SelectItem value="at-least">At least (≥)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="trend-unit">Unit</Label>
        <Input
          id="trend-unit"
          value={page.metric.unit}
          onChange={(event) => format("unit", event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="trend-precision">Precision</Label>
        <Select
          value={String(page.metric.precision)}
          onValueChange={(value) => {
            if (value === "0" || value === "1" || value === "2")
              format("precision", Number(value))
          }}
        >
          <SelectTrigger id="trend-precision">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">0</SelectItem>
            <SelectItem value="1">1</SelectItem>
            <SelectItem value="2">2</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="trend-position">Unit position</Label>
        <Select
          value={page.metric.unitPosition}
          onValueChange={(value) => {
            if (value === "before" || value === "after")
              format("unitPosition", value)
          }}
        >
          <SelectTrigger id="trend-position">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="after">After</SelectItem>
            <SelectItem value="before">Before</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="trend-spacing">Unit spacing</Label>
        <Select
          value={page.metric.unitSpacing}
          onValueChange={(value) => {
            if (value === "space" || value === "none")
              format("unitSpacing", value)
          }}
        >
          <SelectTrigger id="trend-spacing">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="space">Space</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
      </div>
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
  week,
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

  return (
    <EditorialPageEditorChrome
      week={week}
      page={page}
      pageIndex={pageIndex}
      onChange={onChange}
      readOnly={readOnly}
      invalidPaths={paths}
      readinessIssues={issues}
    >
      <TrendMetricLabel page={page} paths={paths} update={update} />
      <TrendDateRangeControls
        page={page}
        paths={paths}
        trendControls={trendControls}
      />
      <TrendObservationControls
        page={page}
        paths={paths}
        trendControls={trendControls}
        readOnly={readOnly}
      />
      <TrendMetricFormatControls
        page={page}
        paths={paths}
        trendControls={trendControls}
        update={update}
      />
      <TrendNarrativeControls page={page} paths={paths} update={update} />
    </EditorialPageEditorChrome>
  )
}
