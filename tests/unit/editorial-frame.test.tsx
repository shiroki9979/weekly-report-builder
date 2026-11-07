import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { EditorialFrame } from "@/components/stage/editorial-frame"
import type { StagePageContext } from "@/lib/stage-page-context"

function renderFrame(showPageNumber: boolean) {
  const context: StagePageContext = {
    documentId: "2026-08-24",
    theme: "default",
    frameLabel: "2026-08-24 — 2026-08-28",
    hidden: false,
    position: { index: 2, total: 5 },
    showPageNumber,
  }
  return render(
    <EditorialFrame eyebrow="Overview" headline="Headline" context={context}>
      <p>Body</p>
    </EditorialFrame>
  )
}

describe("EditorialFrame page number row", () => {
  it("shows Deck Title even when page numbers are hidden", () => {
    const { container } = render(
      <EditorialFrame
        eyebrow="Overview"
        headline="Headline"
        context={{
          documentId: "harbor",
          theme: "observatory",
          deckTitle: "Harbor Forecast",
          frameLabel: null,
          hidden: false,
          position: { index: 1, total: 1 },
          showPageNumber: false,
        }}
      >
        <p>Body</p>
      </EditorialFrame>
    )
    expect(container.querySelector("footer")).toHaveTextContent(
      "Harbor Forecast"
    )
    expect(container.querySelector("footer")).not.toHaveAttribute("aria-hidden")
    expect(container.querySelector("footer")).not.toHaveTextContent("1 / 1")
  })

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
