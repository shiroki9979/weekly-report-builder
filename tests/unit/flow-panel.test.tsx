import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FlowPanelView } from "@/components/stage/panels/flow-panel"
import type { FlowPanel } from "@/lib/week-document"

const samplePanel: FlowPanel = {
  kind: "flow",
  title: "Cross-environment path",
  steps: [
    { label: "Source env", caption: "@production", variant: "default" },
    { label: "Download tar.gz", caption: "Model archive" },
    { label: "Target env", caption: "New version", variant: "ok" },
  ],
}

describe("FlowPanelView", () => {
  it("renders an ordered list of steps with title and caption", () => {
    render(<FlowPanelView panel={samplePanel} />)

    expect(screen.getByText("Cross-environment path")).toBeInTheDocument()

    const steps = screen.getAllByTestId("flow-step")
    expect(steps).toHaveLength(3)
    expect(steps[0]).toHaveTextContent("Source env")
    expect(steps[0]).toHaveTextContent("@production")
    expect(steps[2]).toHaveTextContent("Target env")
    expect(steps[2]).toHaveClass("ok")

    const arrows = screen.getAllByTestId("flow-step-arrow")
    expect(arrows).toHaveLength(2)
  })
})
