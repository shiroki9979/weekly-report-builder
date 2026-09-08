import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  addChartCategory,
  addChartSeries,
  removeChartCategory,
  removeChartSeries,
  setChartCategory,
  setChartPanelTitle,
  setChartSeriesColor,
  setChartSeriesName,
  setChartSeriesValue,
} from "@/lib/week-editor"
import type { ChartPanel, WeekDocument } from "@/lib/week-document"

type ChartEditorFormProps = {
  week: WeekDocument
  pageIndex: number
  panel: ChartPanel
  onChange: (week: WeekDocument) => void
}

export function ChartEditorForm({
  week,
  pageIndex,
  panel,
  onChange,
}: ChartEditorFormProps) {
  return (
    <fieldset className="space-y-3 rounded-md border p-3">
      <legend className="px-1 text-xs font-medium text-muted-foreground">
        Chart panel
      </legend>

      <div className="space-y-2">
        <Label htmlFor="chart-panel-title">Panel title</Label>
        <Input
          id="chart-panel-title"
          value={panel.title}
          onChange={(event) =>
            onChange(setChartPanelTitle(week, pageIndex, event.target.value))
          }
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Categories</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(addChartCategory(week, pageIndex))}
          >
            Add category
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {panel.categories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="flex gap-2">
              <Input
                aria-label={`Category ${categoryIndex + 1}`}
                value={category}
                onChange={(event) =>
                  onChange(
                    setChartCategory(
                      week,
                      pageIndex,
                      categoryIndex,
                      event.target.value
                    )
                  )
                }
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onChange(removeChartCategory(week, pageIndex, categoryIndex))
                }
                disabled={panel.categories.length <= 1}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label>Series</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(addChartSeries(week, pageIndex))}
          >
            Add series
          </Button>
        </div>

        {panel.series.map((series, seriesIndex) => (
          <fieldset
            key={seriesIndex}
            className="space-y-2 rounded-md border border-dashed p-3"
          >
            <legend className="px-1 text-xs text-muted-foreground">
              Series {seriesIndex + 1}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`series-name-${seriesIndex}`}>Name</Label>
                <Input
                  id={`series-name-${seriesIndex}`}
                  value={series.name}
                  onChange={(event) =>
                    onChange(
                      setChartSeriesName(
                        week,
                        pageIndex,
                        seriesIndex,
                        event.target.value
                      )
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`series-color-${seriesIndex}`}>Color</Label>
                <Input
                  id={`series-color-${seriesIndex}`}
                  placeholder="#2e75b6"
                  value={series.color ?? ""}
                  onChange={(event) =>
                    onChange(
                      setChartSeriesColor(
                        week,
                        pageIndex,
                        seriesIndex,
                        event.target.value
                      )
                    )
                  }
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {panel.categories.map((category, categoryIndex) => (
                <div key={categoryIndex} className="space-y-2">
                  <Label
                    htmlFor={`series-${seriesIndex}-value-${categoryIndex}`}
                  >
                    {category || `Category ${categoryIndex + 1}`}
                  </Label>
                  <Input
                    id={`series-${seriesIndex}-value-${categoryIndex}`}
                    type="number"
                    min={0}
                    value={series.values[categoryIndex] ?? 0}
                    onChange={(event) =>
                      onChange(
                        setChartSeriesValue(
                          week,
                          pageIndex,
                          seriesIndex,
                          categoryIndex,
                          Number(event.target.value)
                        )
                      )
                    }
                  />
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onChange(removeChartSeries(week, pageIndex, seriesIndex))
              }
              disabled={panel.series.length <= 1}
            >
              Remove series
            </Button>
          </fieldset>
        ))}
      </div>
    </fieldset>
  )
}
