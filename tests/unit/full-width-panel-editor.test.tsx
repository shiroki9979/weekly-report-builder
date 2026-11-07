import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import {
  setTablePanelCell,
  setTableReferenceColumn,
  removeTableColumn,
} from "@/lib/deck-editor"
import { isFullWidthPanelPage, type Deck } from "@/lib/deck"
import { FullWidthPanelEditorForm } from "@/components/workshop/full-width-panel-editor-form"

function tableDeck(
  layout: "two-column" | "full-width-panel" = "full-width-panel"
): Deck {
  return {
    pages: [
      {
        id: "table",
        layout,
        title: "Pilot checks",
        ...(layout === "two-column"
          ? {
              items: [
                { heading: "Scope", body: "Three sites" },
                { heading: "Result", body: "Ready" },
                { heading: "Next", body: "Review" },
              ],
            }
          : {}),
        panel: {
          kind: "table",
          title: "",
          columns: ["Check", "Result", "Page"],
          rows: [{ cells: ["Cold export", "Passed", "03"] }],
        },
      },
    ],
  }
}

describe("Full-width Panel editor", () => {
  it("reuses table edits without adding narrative items or changing the source Deck", () => {
    const deck = tableDeck()

    const edited = setTablePanelCell(deck, 0, 0, 1, "Verified")

    expect(edited.pages[0]).toMatchObject({
      panel: { rows: [{ cells: ["Cold export", "Verified", "03"] }] },
    })
    expect(edited.pages[0]).not.toHaveProperty("items")
    expect(deck.pages[0]).toMatchObject({
      panel: { rows: [{ cells: ["Cold export", "Passed", "03"] }] },
    })
  })
})

it.each(["two-column", "full-width-panel"] as const)(
  "keeps the reference attached to its data column when %s columns are removed",
  (layout) => {
    const deck = tableDeck(layout)
    const selected = setTableReferenceColumn(deck, 0, 2)

    const shifted = removeTableColumn(selected, 0, 0)
    expect(shifted.pages[0]).toMatchObject({
      panel: {
        columns: ["Result", "Page"],
        referenceColumn: 1,
        rows: [{ cells: ["Passed", "03"] }],
      },
    })
    expect(selected.pages[0]).toMatchObject({ panel: { referenceColumn: 2 } })

    const cleared = removeTableColumn(shifted, 0, 1)
    expect(cleared.pages[0]).toMatchObject({
      panel: {
        columns: ["Result"],
        referenceColumn: undefined,
      },
    })
  }
)

function FullWidthHarness() {
  const [deck, setDeck] = useState(tableDeck())
  const page = deck.pages[0]
  if (!isFullWidthPanelPage(page)) throw new Error("Expected Full-width Panel")
  return (
    <FullWidthPanelEditorForm
      deck={deck}
      pageIndex={0}
      page={page}
      onChange={setDeck}
    />
  )
}

it("edits a full-width table and clears its reference when the selected column is removed", async () => {
  const user = userEvent.setup()
  render(<FullWidthHarness />)

  expect(
    screen.getByRole("textbox", { name: "Panel title" })
  ).not.toHaveAttribute("aria-invalid", "true")
  expect(
    screen.queryByRole("textbox", { name: "Heading" })
  ).not.toBeInTheDocument()
  await user.type(
    screen.getByRole("textbox", { name: "Boundary Note" }),
    "Pilot only"
  )
  await user.clear(screen.getByRole("textbox", { name: "Row 1, col 2" }))
  await user.type(
    screen.getByRole("textbox", { name: "Row 1, col 2" }),
    "Verified"
  )
  await user.click(screen.getByRole("combobox", { name: "Reference column" }))
  await user.click(screen.getByRole("option", { name: "Page", exact: true }))
  expect(
    screen.getByRole("combobox", { name: "Reference column" })
  ).toHaveTextContent("Page")

  await user.click(screen.getByRole("button", { name: "Remove column" }))

  expect(
    screen.getByRole("combobox", { name: "Reference column" })
  ).toHaveTextContent("None")
  expect(screen.getByRole("textbox", { name: "Row 1, col 2" })).toHaveValue(
    "Verified"
  )
  expect(screen.getByRole("textbox", { name: "Boundary Note" })).toHaveValue(
    "Pilot only"
  )
})
