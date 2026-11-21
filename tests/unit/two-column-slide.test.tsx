import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StageSlide } from "@/components/stage/stage-slide"
import { DECK_THEMES, parseDeck, type Deck } from "@/lib/deck"
import { createStagePageContext } from "@/lib/stage-page-context"

const fixturePath = resolve(
  import.meta.dirname,
  "../fixtures/two-column-week.json"
)

function renderFirstPage(deck: Deck) {
  const page = deck.pages[0]
  return render(
    <StageSlide
      page={page}
      context={createStagePageContext("2026-08-24", deck, page.id)}
    />
  )
}

function fixtureDeck(overrides: Partial<Deck> = {}): Deck {
  const deck = parseDeck(JSON.parse(readFileSync(fixturePath, "utf-8")))
  return { ...deck, ...overrides }
}

// § nn 是 observatory 的外框裝飾，不算 eyebrow 文字；保留行高的空白也不算
function eyebrowText(container: HTMLElement): string {
  const eyebrow = container.querySelector(".editorial-eyebrow")
  if (!eyebrow) throw new Error("expected an eyebrow row")
  return Array.from(eyebrow.childNodes)
    .filter(
      (node) =>
        !(
          node instanceof HTMLElement &&
          node.classList.contains("editorial-page-index")
        )
    )
    .map((node) => node.textContent)
    .join("")
    .trim()
}

describe("TwoColumnSlide", () => {
  it("renders title, three left items, and a right table on the stage", () => {
    renderFirstPage(fixtureDeck())

    expect(
      screen.getByRole("heading", { level: 1, name: "Eval Gate" })
    ).toBeInTheDocument()
    expect(screen.getByText("Metrics follow the task")).toBeInTheDocument()
    expect(screen.getByText("Manual promote is allowed")).toBeInTheDocument()
    expect(screen.getByText("Production can be pinned")).toBeInTheDocument()
    expect(screen.getByText("Loaded model")).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Action" })
    ).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "Pinned" })).toHaveClass("strong")
  })

  describe.each(DECK_THEMES)("in the %s theme", (theme) => {
    it("draws the Editorial Frame with Frame Label, Deck Title, and Page Position", () => {
      const { container } = renderFirstPage(
        fixtureDeck({ theme, title: "Harbor Forecast" })
      )

      expect(screen.getByText("2026-08-24 — 2026-08-28")).toBeVisible()
      const footer = screen.getByRole("contentinfo")
      expect(footer).toHaveTextContent("Harbor Forecast")
      expect(footer).toHaveTextContent("1 / 2")
      expect(eyebrowText(container)).toBe("")
    })

    it("leaves out the Frame Label when the deck has no period", () => {
      const { container } = renderFirstPage(
        fixtureDeck({ theme, period: undefined })
      )

      expect(container.querySelector(".editorial-period")).toBeNull()
      expect(screen.getByRole("contentinfo")).toHaveTextContent("1 / 2")
    })
  })

  it("shows the Boundary Note when the page has one", () => {
    const deck = fixtureDeck()
    renderFirstPage({
      ...deck,
      pages: [
        { ...deck.pages[0], boundary: "Fictional sample only" },
        ...deck.pages.slice(1),
      ],
    })

    expect(screen.getByText("Fictional sample only")).toBeVisible()
  })
})
