import { render, screen, cleanup } from "@testing-library/react"
import { expect, it } from "vitest"
import { StageSlide } from "@/components/stage/stage-slide"
import { parseDeck } from "@/lib/deck"
import { createStagePageContext } from "@/lib/stage-page-context"
import { createBlankTwoColumnPage } from "@/lib/page-lifecycle"

it("preserves the panel heading slot in an existing Two-column draft", () => {
  const page = createBlankTwoColumnPage("p01", "table")
  const deck = { pages: [page] }
  render(
    <StageSlide
      page={page}
      context={createStagePageContext("harbor", deck, page.id)}
    />
  )
  expect(screen.getByRole("heading", { level: 4 })).toBeEmptyDOMElement()
})

it("renders each Full-width panel with the common frame and no empty panel heading", () => {
  for (const panel of [
    {
      kind: "table",
      title: "",
      columns: ["Check", "Page"],
      rows: [{ cells: ["Verified", "3"] }],
      referenceColumn: 1,
    },
    { kind: "flow", title: "", steps: [{ label: "Verified" }] },
    { kind: "checklist", title: "", items: [{ label: "Verified" }] },
    {
      kind: "chart",
      title: "",
      categories: ["Pilot"],
      series: [{ name: "Verified", values: [3] }],
    },
  ]) {
    const deck = parseDeck({
      title: "Harbor",
      pages: [
        {
          id: "p01",
          layout: "full-width-panel",
          title: "Pilot checks",
          boundary: "Fictional sample",
          panel,
        },
      ],
    })
    render(
      <StageSlide
        page={deck.pages[0]}
        context={createStagePageContext("harbor", deck, "p01")}
      />
    )
    expect(screen.getAllByRole("heading")).toHaveLength(1)
    expect(
      screen.getByRole("heading", { name: "Pilot checks" })
    ).toBeInTheDocument()
    expect(screen.getByText("Verified")).toBeInTheDocument()
    expect(screen.getByText("Fictional sample")).toBeInTheDocument()
    expect(screen.getByText("Harbor")).toBeInTheDocument()
    if (panel.kind === "table") {
      expect(
        screen.getAllByRole("columnheader").map((header) => header.textContent)
      ).toEqual(["Check", "Page"])
      expect(
        screen.getAllByRole("cell").map((cell) => cell.textContent)
      ).toEqual(["Verified", "3"])
    }
    cleanup()
  }
})
