import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ChecklistPanelView } from "@/components/stage/panels/checklist-panel"
import type { ChecklistPanel } from "@/lib/deck"

const samplePanel: ChecklistPanel = {
  kind: "checklist",
  title: "Next checks",
  items: [
    { label: "Scale diagnostics pass before rollout", checked: false },
    { label: "Compile Harbor day-1 baseline table", checked: true },
    { label: "Promote only if it beats production champion" },
  ],
}

describe("ChecklistPanelView", () => {
  it("renders a list of check items on the right card", () => {
    render(<ChecklistPanelView panel={samplePanel} />)

    expect(screen.getByText("Next checks")).toBeInTheDocument()

    const items = screen.getAllByTestId("checklist-item")
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent(
      "Scale diagnostics pass before rollout"
    )
    expect(items[0]).not.toHaveClass("checked")
    expect(items[1]).toHaveClass("checked")
    expect(items[2]).not.toHaveClass("checked")
  })
})
