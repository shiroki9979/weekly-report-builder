import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { MetricFormat } from "@/lib/metric-format"

type MetricFormatFieldsProps = {
  idPrefix: string
  format: MetricFormat
  onChange: (patch: Partial<MetricFormat>) => void
}

type PrecisionOption = `${MetricFormat["precision"]}`

const UNIT_POSITION_LABELS: Record<MetricFormat["unitPosition"], string> = {
  after: "After",
  before: "Before",
}

const UNIT_SPACING_LABELS: Record<MetricFormat["unitSpacing"], string> = {
  space: "Space",
  none: "None",
}

const PRECISION_BY_OPTION: Record<PrecisionOption, MetricFormat["precision"]> =
  { "0": 0, "1": 1, "2": 2 }

const PRECISION_LABELS: Record<PrecisionOption, string> = {
  "0": "0",
  "1": "1",
  "2": "2",
}

// Comparison Metric 與 Trend & Target 共用同一組單位格式欄位，選項與驗證不會分岔
export function MetricFormatFields({
  idPrefix,
  format,
  onChange,
}: MetricFormatFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-unit`}>Unit</Label>
        <Input
          id={`${idPrefix}-unit`}
          value={format.unit}
          onChange={(event) => onChange({ unit: event.target.value })}
        />
      </div>
      <FormatSelect
        id={`${idPrefix}-position`}
        label="Unit position"
        value={format.unitPosition}
        labels={UNIT_POSITION_LABELS}
        onSelect={(unitPosition) => onChange({ unitPosition })}
      />
      <FormatSelect
        id={`${idPrefix}-spacing`}
        label="Unit spacing"
        value={format.unitSpacing}
        labels={UNIT_SPACING_LABELS}
        onSelect={(unitSpacing) => onChange({ unitSpacing })}
      />
      <FormatSelect
        id={`${idPrefix}-precision`}
        label="Precision"
        value={`${format.precision}` as const}
        labels={PRECISION_LABELS}
        onSelect={(option) =>
          onChange({ precision: PRECISION_BY_OPTION[option] })
        }
      />
    </>
  )
}

type FormatSelectProps<T extends string> = {
  id: string
  label: string
  value: T
  labels: Record<T, string>
  onSelect: (value: T) => void
}

function FormatSelect<T extends string>({
  id,
  label,
  value,
  labels,
  onSelect,
}: FormatSelectProps<T>) {
  const options = Object.keys(labels) as T[]
  const isOption = (candidate: unknown): candidate is T =>
    typeof candidate === "string" && Object.hasOwn(labels, candidate)
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value}
        onValueChange={(next) => {
          if (isOption(next)) onSelect(next)
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {labels[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
