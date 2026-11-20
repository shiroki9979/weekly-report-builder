import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, it } from "vitest"

import { StageSlide } from "@/components/stage/stage-slide"
import { PageEditorForm } from "@/components/workshop/page-editor-form"
import { parseDeck, type Deck } from "@/lib/deck"
import { serializeDeck } from "@/lib/decks-io"
import { createStagePageContext } from "@/lib/stage-page-context"
import {
  unusedComparisonMetricControls,
  unusedTrendControls,
} from "./support/editor-controls"

const fixturePath = resolve(
  import.meta.dirname,
  "../fixtures/two-column-week.json"
)

function fixtureDeck(): Deck {
  return parseDeck(JSON.parse(readFileSync(fixturePath, "utf-8")))
}

// 編輯器與 preview 共用同一份 Deck state，才看得到欄位輸入是否真的走到 Stage
function TwoColumnWorkshop({
  initialDeck = fixtureDeck(),
  readOnly = false,
}: {
  initialDeck?: Deck
  readOnly?: boolean
}) {
  const [deck, setDeck] = useState(initialDeck)
  const page = deck.pages[0]
  return (
    <>
      <PageEditorForm
        deck={deck}
        pageIndex={0}
        onChange={(update) => setDeck((current) => update(current))}
        layoutControls={{
          evidenceDecision: unusedComparisonMetricControls,
          trendTarget: unusedTrendControls,
        }}
        readOnly={readOnly}
      />
      <section aria-label="Preview">
        <StageSlide
          page={page}
          context={createStagePageContext("2026-08-24", deck, page.id)}
        />
      </section>
      <pre data-testid="deck-json">{serializeDeck(deck)}</pre>
    </>
  )
}

function deckJson(): Deck {
  return JSON.parse(screen.getByTestId("deck-json").textContent ?? "")
}

it("shows a Two-column Boundary Note in the preview and drops it from the Deck JSON once cleared", async () => {
  const user = userEvent.setup()
  render(<TwoColumnWorkshop />)
  const field = screen.getByRole("textbox", { name: "Boundary Note" })

  await user.type(field, "Fictional sample only")

  const preview = screen.getByRole("region", { name: "Preview" })
  expect(preview).toHaveTextContent("Fictional sample only")
  expect(deckJson().pages[0]).toHaveProperty(
    "boundary",
    "Fictional sample only"
  )

  await user.clear(field)

  expect(preview).not.toHaveTextContent("Fictional sample only")
  expect(deckJson().pages[0]).not.toHaveProperty("boundary")
})

it("disables the Two-column Boundary Note while the editor is read-only", () => {
  const deck = fixtureDeck()
  render(
    <TwoColumnWorkshop
      readOnly
      initialDeck={{
        ...deck,
        pages: [
          { ...deck.pages[0], boundary: "Fictional sample only" },
          ...deck.pages.slice(1),
        ],
      }}
    />
  )

  const field = screen.getByRole("textbox", { name: "Boundary Note" })
  expect(field).toBeDisabled()
  expect(field).toHaveValue("Fictional sample only")
})
