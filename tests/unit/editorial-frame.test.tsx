import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { EditorialFrame } from "@/components/stage/editorial-frame"
import type { StagePageContext } from "@/lib/stage-page-context"

function renderFrame(showPageNumber: boolean) {
  const context: StagePageContext = {
    documentId: "2026-08-24",
    frameLabel: "2026-08-24 — 2026-08-28",
    pageLabel: "2 / 5",
    showPageNumber,
  }
  return render(
    <EditorialFrame eyebrow="Overview" headline="Headline" context={context}>
      <p>Body</p>
    </EditorialFrame>
  )
}

describe("EditorialFrame page number row", () => {
  it("shows the page label when page numbers are visible", () => {
    const { container } = renderFrame(true)

    const footer = container.querySelector("footer")
    expect(footer).toHaveTextContent("2 / 5")
    expect(footer).not.toHaveAttribute("aria-hidden")
  })

  it("keeps an empty row when page numbers are hidden so the body keeps its bottom margin", () => {
    const { container } = renderFrame(false)

    const footer = container.querySelector("footer")
    expect(footer).toBeInTheDocument()
    expect(footer).toHaveAttribute("aria-hidden", "true")
    expect(footer).not.toHaveTextContent("2 / 5")
  })
})
