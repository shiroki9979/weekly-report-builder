import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it } from "vitest"

import { setDeckTheme, setDeckTitle } from "@/lib/deck-editor"
import { WorkshopToolbar } from "@/components/workshop/workshop-toolbar"
import {
  createEditingSession,
  editSessionContent,
  finishSessionSave,
  sessionOperationSnapshot,
} from "@/lib/editing-session"

function ThemeHarness({ disabled = false }: { disabled?: boolean }) {
  const [session, setSession] = useState(() =>
    finishSessionSave(createEditingSession({ pages: [] }, "harbor"))
  )
  return (
    <>
      <WorkshopToolbar
        decks={["harbor"]}
        selectedDeckId="harbor"
        onDeckChange={() => {}}
        save={{
          onSave: () => {},
          saving: false,
          message: session.savedMessage,
          error: null,
        }}
        create={{
          onCreate: () => {},
          creating: false,
          error: null,
          suggestedMonday: "2026-11-09",
        }}
        appearance={{
          theme: session.deck?.theme ?? "default",
          title: session.deck?.title ?? "",
          disabled,
          onThemeChange: (theme) =>
            setSession((current) =>
              editSessionContent(current, (deck) => setDeckTheme(deck, theme))
            ),
          onTitleChange: (title) =>
            setSession((current) =>
              editSessionContent(current, (deck) => setDeckTitle(deck, title))
            ),
        }}
      />
      <output aria-label="Saved Deck">
        {JSON.stringify(sessionOperationSnapshot(session)?.deck)}
      </output>
    </>
  )
}

describe("Deck appearance toolbar", () => {
  it("changes the Deck Theme through the Editing Session and clears Saved status", async () => {
    const user = userEvent.setup()
    render(<ThemeHarness />)
    expect(screen.getByText("Saved", { exact: true })).toBeInTheDocument()

    await user.click(screen.getByRole("combobox", { name: "Theme" }))
    await user.click(await screen.findByRole("option", { name: "Observatory" }))

    expect(screen.getByRole("combobox", { name: "Theme" })).toHaveTextContent(
      "Observatory"
    )
    expect(screen.getByLabelText("Saved Deck")).toHaveTextContent(
      '"theme":"observatory"'
    )
    expect(screen.queryByText("Saved", { exact: true })).not.toBeInTheDocument()
  })
  it("updates the Deck Title and allows it to be cleared", async () => {
    const user = userEvent.setup()
    render(<ThemeHarness />)

    await user.type(
      screen.getByRole("textbox", { name: "Deck Title" }),
      "Harbor forecast"
    )

    expect(screen.getByLabelText("Saved Deck")).toHaveTextContent(
      '"title":"Harbor forecast"'
    )
    expect(screen.queryByText("Saved", { exact: true })).not.toBeInTheDocument()
    await user.clear(screen.getByRole("textbox", { name: "Deck Title" }))
    expect(screen.getByRole("textbox", { name: "Deck Title" })).toHaveValue("")
    expect(screen.getByLabelText("Saved Deck")).toHaveTextContent(
      '{"pages":[]}'
    )
  })

  it("locks both appearance fields while browsing", async () => {
    const user = userEvent.setup()
    render(<ThemeHarness disabled />)

    const theme = screen.getByRole("combobox", { name: "Theme" })
    const title = screen.getByRole("textbox", { name: "Deck Title" })
    expect(theme).toBeDisabled()
    expect(title).toBeDisabled()
    await user.click(theme)
    await user.type(title, "Changed")

    expect(screen.queryByRole("option")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Saved Deck")).toHaveTextContent(
      '{"pages":[]}'
    )
    expect(screen.getByText("Saved", { exact: true })).toBeInTheDocument()
  })
})
