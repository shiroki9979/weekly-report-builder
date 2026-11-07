import { cn } from "@/lib/utils"
import type { TablePanel } from "@/lib/deck"

type TablePanelViewProps = {
  panel: TablePanel
  showTitle?: boolean
  rowIndices?: boolean
}

export function TablePanelView({
  panel,
  showTitle = true,
  rowIndices = false,
}: TablePanelViewProps) {
  return (
    <aside className="stage-panel">
      {showTitle ? <h4>{panel.title}</h4> : null}
      <table>
        <thead>
          <tr>
            {rowIndices ? (
              <th
                className="stage-table-row-index"
                scope="col"
                aria-hidden="true"
              />
            ) : null}
            {panel.columns.map((column, index) => (
              <th
                key={index}
                scope="col"
                className={
                  index === panel.referenceColumn
                    ? "stage-table-reference"
                    : undefined
                }
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {panel.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {rowIndices ? (
                <td className="stage-table-row-index" aria-hidden="true">
                  {String(rowIndex + 1).padStart(2, "0")}
                </td>
              ) : null}
              {row.cells.map((cell, cellIndex) => {
                const emphasized = row.emphasis?.includes(cellIndex)

                return (
                  <td
                    key={cellIndex}
                    className={cn(
                      emphasized && "strong",
                      cellIndex === panel.referenceColumn &&
                        "stage-table-reference"
                    )}
                  >
                    {cell}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </aside>
  )
}
