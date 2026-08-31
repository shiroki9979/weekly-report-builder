import type { TablePanel } from "@/lib/week-document"

type TablePanelViewProps = {
  panel: TablePanel
}

export function TablePanelView({ panel }: TablePanelViewProps) {
  return (
    <aside className="stage-panel">
      <h4>{panel.title}</h4>
      <table>
        <thead>
          <tr>
            {panel.columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {panel.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.cells.map((cell, cellIndex) => {
                const emphasized = row.emphasis?.includes(cellIndex)

                return (
                  <td
                    key={cellIndex}
                    className={emphasized ? "strong" : undefined}
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
