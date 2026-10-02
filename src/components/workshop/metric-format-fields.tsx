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
import {
  METRIC_PRECISIONS,
  UNIT_POSITIONS,
  UNIT_SPACINGS,
  type UnitPosition,
  type UnitSpacing,
} from "@/lib/deck"

type MetricFormatFieldsProps = {
  idPrefix: string
  format: MetricFormat
  onChange: (patch: Partial<MetricFormat>) => void
}

const UNIT_POSITION_LABELS: Record<UnitPosition, string> = {
  after: "After",
  before: "Before",
}

const UNIT_SPACING_LABELS: Record<UnitSpacing, string> = {
  space: "Space",
  none: "None",
}

// Comparison Metric 與 Trend & Target 共用同一組單位格式欄位；
// 選項取自 parser 驗證用的同一份清單，編輯器能選的值與可存檔的值不會分岔
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
        options={UNIT_POSITIONS}
        labelOf={(position) => UNIT_POSITION_LABELS[position]}
        onSelect={(unitPosition) => onChange({ unitPosition })}
      />
      <FormatSelect
        id={`${idPrefix}-spacing`}
        label="Unit spacing"
        value={format.unitSpacing}
        options={UNIT_SPACINGS}
        labelOf={(spacing) => UNIT_SPACING_LABELS[spacing]}
        onSelect={(unitSpacing) => onChange({ unitSpacing })}
      />
      <FormatSelect
        id={`${idPrefix}-precision`}
        label="Precision"
        value={format.precision}
        options={METRIC_PRECISIONS}
        labelOf={String}
        onSelect={(precision) => onChange({ precision })}
      />
    </>
  )
}

type FormatSelectProps<T extends string | number> = {
  id: string
  label: string
  value: T
  options: readonly T[]
  labelOf: (option: T) => string
  onSelect: (value: T) => void
}

// Select 只收字串值；以選項本身的字串形式對回原值，數字精度也能共用同一元件
function FormatSelect<T extends string | number>({
  id,
  label,
  value,
  options,
  labelOf,
  onSelect,
}: FormatSelectProps<T>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={String(value)}
        onValueChange={(next) => {
          const option = options.find((candidate) => String(candidate) === next)
          if (option !== undefined) onSelect(option)
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {labelOf(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
