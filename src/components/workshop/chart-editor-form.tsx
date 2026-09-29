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
} from "@/lib/deck-editor"
import { issuePathsFor } from "@/lib/export-readiness"
import type { PanelEditorProps } from "@/components/workshop/page-editor-props"
import { canRemoveEntry, CARDINALITY, type ChartPanel } from "@/lib/deck"

export function ChartEditorForm({
  deck,
  pageIndex,
  panel,
  onChange,
}: PanelEditorProps<ChartPanel>) {
  const invalidPaths = issuePathsFor(deck.pages[pageIndex])

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
          aria-invalid={invalidPaths.has("panel.title") || undefined}
          onChange={(event) =>
            onChange((currentDeck) =>
              setChartPanelTitle(currentDeck, pageIndex, event.target.value)
            )
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
            onClick={() =>
              onChange((currentDeck) =>
                addChartCategory(currentDeck, pageIndex)
              )
            }
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
                aria-invalid={
                  invalidPaths.has(`panel.categories[${categoryIndex}]`) ||
                  undefined
                }
                onChange={(event) =>
                  onChange((currentDeck) =>
                    setChartCategory(
                      currentDeck,
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
                  onChange((currentDeck) =>
                    removeChartCategory(currentDeck, pageIndex, categoryIndex)
                  )
                }
                disabled={
                  !canRemoveEntry(panel.categories, CARDINALITY.chartCategories)
                }
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
            onClick={() =>
              onChange((currentDeck) => addChartSeries(currentDeck, pageIndex))
            }
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
                  aria-invalid={
                    invalidPaths.has(`panel.series[${seriesIndex}].name`) ||
                    undefined
                  }
                  onChange={(event) =>
                    onChange((currentDeck) =>
                      setChartSeriesName(
                        currentDeck,
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
                    onChange((currentDeck) =>
                      setChartSeriesColor(
                        currentDeck,
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
                    aria-invalid={
                      invalidPaths.has(
                        `panel.series[${seriesIndex}].values[${categoryIndex}]`
                      ) ||
                      invalidPaths.has(`panel.series[${seriesIndex}].values`) ||
                      undefined
                    }
                    value={series.values[categoryIndex] ?? 0}
                    onChange={(event) =>
                      onChange((currentDeck) =>
                        setChartSeriesValue(
                          currentDeck,
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
                onChange((currentDeck) =>
                  removeChartSeries(currentDeck, pageIndex, seriesIndex)
                )
              }
              disabled={!canRemoveEntry(panel.series, CARDINALITY.chartSeries)}
            >
              Remove series
            </Button>
          </fieldset>
        ))}
      </div>
    </fieldset>
  )
}
