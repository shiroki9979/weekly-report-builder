import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CoverEditorForm } from "@/components/workshop/cover-editor-form"
import { ClosingEditorForm } from "@/components/workshop/closing-editor-form"
import { isCoverPage, isClosingPage } from "@/lib/deck"
import { describe, expect, it } from "vitest"

import { setCoverFields } from "@/lib/cover-editor"
import {
  setClosingFields,
  addTakeaway,
  setTakeaway,
  moveTakeaway,
  removeTakeaway,
} from "@/lib/closing-editor"
import type { Deck } from "@/lib/deck"

describe("Cover and Closing editor modules", () => {
  it("edits a Cover subtitle and byline without changing the source Deck", () => {
    const deck: Deck = {
      pages: [
        {
          id: "opening",
          layout: "cover",
          title: "Pilot review",
          subtitle: "",
          byline: "",
        },
      ],
    }

    const edited = setCoverFields(deck, 0, {
      subtitle: "Results from the harbor pilot",
      byline: "Forecast team",
    })

    expect(edited.pages[0]).toMatchObject({
      subtitle: "Results from the harbor pilot",
      byline: "Forecast team",
    })
    expect(deck.pages[0]).toMatchObject({ subtitle: "", byline: "" })
  })
  it("edits Closing labels while retaining its takeaways", () => {
    const deck: Deck = {
      pages: [
        {
          id: "closing",
          layout: "closing",
          title: "Keep the pilot",
          eyebrow: "",
          closingLine: "",
          takeaways: [{ text: "Review the forecast", ref: "03" }],
        },
      ],
    }

    const edited = setClosingFields(deck, 0, {
      eyebrow: "Next",
      closingLine: "Review on Friday",
    })

    expect(edited.pages[0]).toMatchObject({
      eyebrow: "Next",
      closingLine: "Review on Friday",
      takeaways: [{ text: "Review the forecast", ref: "03" }],
    })
  })
  it("adds takeaways up to four and leaves the original Closing unchanged", () => {
    const deck: Deck = {
      pages: [
        {
          id: "closing",
          layout: "closing",
          title: "Next",
          eyebrow: "",
          closingLine: "",
          takeaways: [],
        },
      ],
    }
    let edited = deck
    for (let index = 0; index < 4; index++) edited = addTakeaway(edited, 0)

    expect(edited.pages[0]).toMatchObject({
      takeaways: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }],
    })
    expect(deck.pages[0]).toMatchObject({ takeaways: [] })
    expect(() => addTakeaway(edited, 0)).toThrow(/4/)
  })

  it("edits a takeaway and its optional reference without changing its neighbor", () => {
    const deck: Deck = {
      pages: [
        {
          id: "closing",
          layout: "closing",
          title: "Next",
          eyebrow: "",
          closingLine: "",
          takeaways: [{ text: "First" }, { text: "Second" }],
        },
      ],
    }

    const edited = setTakeaway(deck, 0, {
      index: 1,
      text: "Review the sample",
      ref: "04",
    })

    expect(edited.pages[0]).toMatchObject({
      takeaways: [{ text: "First" }, { text: "Review the sample", ref: "04" }],
    })
  })

  it("moves a takeaway together with its reference", () => {
    const deck: Deck = {
      pages: [
        {
          id: "closing",
          layout: "closing",
          title: "Next",
          eyebrow: "",
          closingLine: "",
          takeaways: [
            { text: "First", ref: "02" },
            { text: "Second", ref: "03" },
          ],
        },
      ],
    }

    const edited = moveTakeaway(deck, 0, { from: 0, to: 1 })

    expect(edited.pages[0]).toMatchObject({
      takeaways: [
        { text: "Second", ref: "03" },
        { text: "First", ref: "02" },
      ],
    })
  })

  it("allows removing the final takeaway but rejects removing from an empty Closing", () => {
    const deck: Deck = {
      pages: [
        {
          id: "closing",
          layout: "closing",
          title: "Next",
          eyebrow: "",
          closingLine: "",
          takeaways: [{ text: "First" }],
        },
      ],
    }

    const edited = removeTakeaway(deck, 0, 0)

    expect(edited.pages[0]).toMatchObject({ takeaways: [] })
    expect(() => removeTakeaway(edited, 0, 0)).toThrow(/0/)
  })
})

function CoverHarness() {
  const [deck, setDeck] = useState<Deck>({
    pages: [
      {
        id: "opening",
        layout: "cover",
        title: "Pilot review",
        subtitle: "",
        byline: "",
      },
    ],
  })
  const page = deck.pages[0]
  if (!isCoverPage(page)) throw new Error("Expected Cover")
  return (
    <CoverEditorForm deck={deck} pageIndex={0} page={page} onChange={setDeck} />
  )
}

it("authors Cover metadata without Boundary Note or page-number controls", async () => {
  const user = userEvent.setup()
  render(<CoverHarness />)

  await user.type(
    screen.getByRole("textbox", { name: "Subtitle" }),
    "Pilot results"
  )
  await user.type(
    screen.getByRole("textbox", { name: "Byline" }),
    "Forecast team"
  )

  expect(screen.getByRole("textbox", { name: "Subtitle" })).toHaveValue(
    "Pilot results"
  )
  expect(screen.getByRole("textbox", { name: "Byline" })).toHaveValue(
    "Forecast team"
  )
  expect(
    screen.queryByRole("textbox", { name: "Boundary Note" })
  ).not.toBeInTheDocument()
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
})

function ClosingHarness() {
  const [deck, setDeck] = useState<Deck>({
    pages: [
      {
        id: "closing",
        layout: "closing",
        title: "Next",
        eyebrow: "",
        closingLine: "",
        takeaways: [],
      },
    ],
  })
  const page = deck.pages[0]
  if (!isClosingPage(page)) throw new Error("Expected Closing")
  return (
    <ClosingEditorForm
      deck={deck}
      pageIndex={0}
      page={page}
      onChange={setDeck}
    />
  )
}

it("authors a Closing takeaway and Boundary Note through the form", async () => {
  const user = userEvent.setup()
  render(<ClosingHarness />)

  await user.click(screen.getByRole("button", { name: "Add takeaway" }))
  await user.type(
    screen.getByRole("textbox", { name: "Takeaway text" }),
    "Review the sample"
  )
  await user.type(screen.getByRole("textbox", { name: "Reference" }), "04")
  await user.type(
    screen.getByRole("textbox", { name: "Boundary Note" }),
    "Pilot only"
  )
  await user.type(
    screen.getByRole("textbox", { name: "Closing line" }),
    "Meet on Friday"
  )

  expect(screen.getByRole("textbox", { name: "Takeaway text" })).toHaveValue(
    "Review the sample"
  )
  expect(screen.getByRole("textbox", { name: "Reference" })).toHaveValue("04")
  expect(screen.getByRole("textbox", { name: "Boundary Note" })).toHaveValue(
    "Pilot only"
  )
  expect(screen.getByRole("textbox", { name: "Closing line" })).toHaveValue(
    "Meet on Friday"
  )
  await user.click(screen.getByRole("button", { name: "Remove" }))
  expect(
    screen.queryByRole("textbox", { name: "Takeaway text" })
  ).not.toBeInTheDocument()
})
