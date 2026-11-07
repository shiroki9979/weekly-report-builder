import { useState } from "react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { type Deck, isSideBySidePage } from "@/lib/deck"
import { SideBySideEditorForm } from "@/components/workshop/side-by-side-editor-form"
import {
  setComparisonColumn,
  addComparisonPoint,
  setComparisonPoint,
  moveComparisonPoint,
  removeComparisonPoint,
  setComparisonChosen,
  setComparisonTradeoff,
} from "@/lib/side-by-side-editor"

const initialDeck: Deck = {
  pages: [
    {
      id: "comparison",
      layout: "side-by-side",
      title: "Choose the pilot path",
      columns: [
        { label: "Cache", points: ["Reuse renders"] },
        { label: "Capture", points: ["No cache state"] },
      ],
    },
  ],
}

describe("Side-by-side Comparison editor", () => {
  it("edits one column without changing its neighbor or the original Deck", () => {
    const edited = setComparisonColumn(initialDeck, 0, {
      column: 0,
      label: "Cached renders",
    })
    expect(edited.pages[0]).toMatchObject({
      columns: [
        { label: "Cached renders", points: ["Reuse renders"] },
        { label: "Capture", points: ["No cache state"] },
      ],
    })
    expect(initialDeck.pages[0]).toMatchObject({
      columns: [{ label: "Cache" }, { label: "Capture" }],
    })
  })
  it("adds, edits, reorders and removes points while keeping one to four per column", () => {
    let edited = addComparisonPoint(initialDeck, 0, 0)
    edited = setComparisonPoint(edited, 0, {
      column: 0,
      point: 1,
      text: "Faster repeats",
    })
    edited = moveComparisonPoint(edited, 0, { column: 0, from: 1, to: 0 })
    expect(edited.pages[0]).toMatchObject({
      columns: [
        { points: ["Faster repeats", "Reuse renders"] },
        { points: ["No cache state"] },
      ],
    })
    edited = removeComparisonPoint(edited, 0, { column: 0, point: 1 })
    expect(() =>
      removeComparisonPoint(edited, 0, { column: 0, point: 0 })
    ).toThrow(/1/)
    for (let index = 0; index < 3; index++)
      edited = addComparisonPoint(edited, 0, 0)
    expect(() => addComparisonPoint(edited, 0, 0)).toThrow(/4/)
    expect(initialDeck.pages[0]).toMatchObject({
      columns: [{ points: ["Reuse renders"] }, { points: ["No cache state"] }],
    })
  })
  it("keeps at most one chosen column and can remove the optional tradeoff entirely", () => {
    let edited = setComparisonChosen(initialDeck, 0, 0)
    edited = setComparisonChosen(edited, 0, 1)
    expect(edited.pages[0]).toMatchObject({ chosen: 1 })
    edited = setComparisonTradeoff(edited, 0, {
      why: "Simple operation",
      cost: "Slower repeat export",
    })
    expect(edited.pages[0]).toMatchObject({
      tradeoff: { why: "Simple operation", cost: "Slower repeat export" },
    })
    edited = setComparisonChosen(edited, 0, undefined)
    edited = setComparisonTradeoff(edited, 0, undefined)
    expect(edited.pages[0].chosen).toBeUndefined()
    expect(edited.pages[0].tradeoff).toBeUndefined()
  })
})

function Harness() {
  const [deck, setDeck] = useState(initialDeck)
  const page = deck.pages[0]
  if (!isSideBySidePage(page)) throw new Error("Expected comparison")
  return (
    <SideBySideEditorForm
      deck={deck}
      pageIndex={0}
      page={page}
      onChange={setDeck}
    />
  )
}

it("authors points, a chosen column, and optional tradeoff through the form", async () => {
  const user = userEvent.setup()
  render(<Harness />)
  const first = within(
    screen.getByRole("group", { name: "Column 1", exact: true })
  )
  const second = within(
    screen.getByRole("group", { name: "Column 2", exact: true })
  )
  await user.clear(first.getByRole("textbox", { name: "Column label" }))
  await user.type(
    first.getByRole("textbox", { name: "Column label" }),
    "Cached renders"
  )
  await user.click(first.getByRole("button", { name: "Add point" }))
  await user.type(
    first.getByRole("textbox", { name: "Point 2" }),
    "Faster repeats"
  )
  await user.click(
    within(first.getByRole("group", { name: "Point 2" })).getByRole("button", {
      name: "Move up",
    })
  )
  expect(first.getByRole("textbox", { name: "Point 1" })).toHaveValue(
    "Faster repeats"
  )
  await user.click(
    within(first.getByRole("group", { name: "Point 2" })).getByRole("button", {
      name: "Remove",
    })
  )
  expect(first.getByRole("button", { name: "Remove" })).toBeDisabled()
  await user.click(first.getByRole("checkbox", { name: "Chosen" }))
  await user.click(second.getByRole("checkbox", { name: "Chosen" }))
  expect(first.getByRole("checkbox", { name: "Chosen" })).not.toBeChecked()
  expect(second.getByRole("checkbox", { name: "Chosen" })).toBeChecked()
  await user.click(second.getByRole("checkbox", { name: "Chosen" }))
  expect(second.getByRole("checkbox", { name: "Chosen" })).not.toBeChecked()
  await user.click(screen.getByRole("checkbox", { name: "Include tradeoff" }))
  await user.type(
    screen.getByRole("textbox", { name: "Why" }),
    "Simple operation"
  )
  await user.type(
    screen.getByRole("textbox", { name: "Cost" }),
    "Slower repeats"
  )
  expect(screen.getByRole("textbox", { name: "Why" })).toHaveValue(
    "Simple operation"
  )
  await user.click(screen.getByRole("checkbox", { name: "Include tradeoff" }))
  expect(screen.queryByRole("textbox", { name: "Why" })).not.toBeInTheDocument()
})
