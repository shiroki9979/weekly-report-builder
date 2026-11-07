import { render, screen, within } from "@testing-library/react"
import { expect, it } from "vitest"
import { StageSlide } from "@/components/stage/stage-slide"
import { parseDeck } from "@/lib/deck"
import { createStagePageContext } from "@/lib/stage-page-context"

it("renders both options with a visible chosen label and authored tradeoff", () => {
  const deck = parseDeck({
    pages: [
      {
        id: "compare",
        layout: "side-by-side",
        title: "Cache rendered pages",
        columns: [
          { label: "Cached renders", points: ["Reuse unchanged pages"] },
          { label: "Per-page capture", points: ["No cache state"] },
        ],
        chosen: 0,
        tradeoff: {
          why: "Reviewers repeat exports",
          cost: "Invalidate cached pages",
        },
        boundary: "Fictional pilot only",
      },
    ],
  })
  render(
    <StageSlide
      page={deck.pages[0]}
      context={createStagePageContext("pilot", deck, "compare")}
    />
  )
  expect(
    screen.getByRole("heading", { name: "Cache rendered pages" })
  ).toBeVisible()
  expect(
    within(screen.getByRole("region", { name: "Cached renders" })).getByText(
      "Chosen"
    )
  ).toBeVisible()
  expect(
    within(
      screen.getByRole("region", { name: "Per-page capture" })
    ).queryByText("Chosen")
  ).toBeNull()
  expect(screen.getByText("Why")).toBeVisible()
  expect(screen.getByText("Reviewers repeat exports")).toBeVisible()
  expect(screen.getByText("Cost")).toBeVisible()
  expect(screen.getByText("Invalidate cached pages")).toBeVisible()
  expect(screen.getByText("Fictional pilot only")).toBeVisible()
})
